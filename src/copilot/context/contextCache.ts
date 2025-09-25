/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { INodeImportClass } from './copilotHelper';
import { logger } from "../utils";
/**
 * Cache entry interface for storing import data with enhanced metadata
 */
interface CacheEntry {
    /** Unique cache entry ID for tracking */
    id: string;
    /** Cached import data */
    value: INodeImportClass[];
    /** Creation timestamp */
    timestamp: number;
    /** Document version when cached */
    documentVersion?: number;
    /** Last access timestamp */
    lastAccess: number;
    /** File content fingerprint for change detection */
    contentFingerprint?: string;
    /** Caret offset when cached (for position-sensitive invalidation) */
    caretOffset?: number;
}

/**
 * Configuration options for the context cache
 */
interface ContextCacheOptions {
    /** Cache expiry time in milliseconds. Default: 10 minutes */
    expiryTime?: number;
    /** Enable automatic cleanup interval. Default: true */
    enableAutoCleanup?: boolean;
    /** Enable file watching for cache invalidation. Default: true */
    enableFileWatching?: boolean;
    /** Maximum cache size (number of entries). Default: 100 */
    maxCacheSize?: number;
    /** Enable content-based invalidation. Default: true */
    enableContentHashing?: boolean;
    /** Cleanup interval in milliseconds. Default: 2 minutes */
    cleanupInterval?: number;
    /** Maximum distance from cached caret position before cache becomes stale. Default: 8192 */
    maxCaretDistance?: number;
    /** Enable position-sensitive cache invalidation. Default: false */
    enablePositionSensitive?: boolean;
    /** Only watch files that are currently cached (more efficient). Default: true */
    watchOnlyCachedFiles?: boolean;
    /** Custom directories to exclude from file watching. Default: common build/dependency folders */
    watcherExcludeDirs?: string[];
}

/**
 * Context cache manager for storing and managing Java import contexts
 */
export class ContextCache {
    private readonly cache = new Map<string, CacheEntry>();
    private readonly expiryTime: number;
    private readonly enableAutoCleanup: boolean;
    private readonly enableFileWatching: boolean;
    private readonly maxCacheSize: number;
    private readonly enableContentHashing: boolean;
    private readonly cleanupIntervalMs: number;
    private readonly maxCaretDistance: number;
    private readonly enablePositionSensitive: boolean;
    private readonly watchOnlyCachedFiles: boolean;
    private readonly watcherExcludeDirs: string[];
    
    private cleanupTimer?: NodeJS.Timeout;
    private fileWatcher?: vscode.FileSystemWatcher;
    private accessCount = 0; // For statistics tracking
    
    constructor(options: ContextCacheOptions = {}) {
        this.expiryTime = options.expiryTime ?? 10 * 60 * 1000; // 10 minutes default
        this.enableAutoCleanup = options.enableAutoCleanup ?? true;
        this.enableFileWatching = options.enableFileWatching ?? true;
        this.maxCacheSize = options.maxCacheSize ?? 100;
        this.enableContentHashing = options.enableContentHashing ?? true;
        this.cleanupIntervalMs = options.cleanupInterval ?? 2 * 60 * 1000; // 2 minutes
        this.maxCaretDistance = options.maxCaretDistance ?? 8192; // Same as CopilotCompletionContextProvider
        this.enablePositionSensitive = options.enablePositionSensitive ?? false;
        this.watchOnlyCachedFiles = options.watchOnlyCachedFiles ?? true;
        this.watcherExcludeDirs = options.watcherExcludeDirs ?? [
            'node_modules', 'target', 'build', 'out', '.git', 
            'bin', '.vscode', '.idea', 'dist', '.next', 'coverage'
        ];
    }
    
    /**
     * Initialize the cache with VS Code extension context
     * @param context VS Code extension context for managing disposables
     */
    public initialize(context: vscode.ExtensionContext): void {
        if (this.enableAutoCleanup) {
            this.startPeriodicCleanup();
        }
        
        if (this.enableFileWatching) {
            this.setupFileWatcher();
        }
        
        // Register cleanup on extension disposal
        context.subscriptions.push(
            new vscode.Disposable(() => {
                this.dispose();
            })
        );
        
        if (this.fileWatcher) {
            context.subscriptions.push(this.fileWatcher);
        }
    }
    
    /**
     * Generate a hash for the document URI to use as cache key
     * Note: We use MD5 for URI hashing because URIs can be long and contain special characters,
     * while MD5 provides consistent, fixed-length keys that are safe for Map keys.
     * @param uri Document URI
     * @returns Hashed URI string
     */
    private generateCacheKey(uri: vscode.Uri): string {
        return crypto.createHash('md5').update(uri.toString()).digest('hex');
    }
    
    /**
     * Get cached imports for a document URI with enhanced validation
     * @param uri Document URI
     * @param currentCaretOffset Optional current caret offset for position-sensitive validation
     * @returns Cached imports or null if not found/expired/stale
     */
    public async get(uri: vscode.Uri, currentCaretOffset?: number): Promise<INodeImportClass[] | null> {
        const key = this.generateCacheKey(uri);
        const cached = this.cache.get(key);
        
        if (!cached) {
            return null;
        }
        
        // Check if cache is expired or stale
        if (await this.isExpiredOrStale(uri, cached, currentCaretOffset)) {
            this.cache.delete(key);
            return null;
        }
        
        // Update last access time and increment access count
        cached.lastAccess = Date.now();
        this.accessCount++;
        
        return cached.value;
    }
    
    /**
     * Get cached imports synchronously (fallback method for compatibility)
     * @param uri Document URI
     * @param currentCaretOffset Optional current caret offset for position-sensitive validation
     * @returns Cached imports or null if not found/expired
     */
    public getSync(uri: vscode.Uri, currentCaretOffset?: number): INodeImportClass[] | null {
        const key = this.generateCacheKey(uri);
        const cached = this.cache.get(key);
        
        if (!cached) {
            return null;
        }
        
        // Check time-based expiry
        if (this.isExpired(cached)) {
            this.cache.delete(key);
            return null;
        }
        
        // Check position-sensitive expiry if enabled and caret offsets available
        if (this.enablePositionSensitive && 
            cached.caretOffset !== undefined && 
            currentCaretOffset !== undefined) {
            if (this.isStaleCacheHit(currentCaretOffset, cached.caretOffset)) {
                this.cache.delete(key);
                return null;
            }
        }
        
        // Update last access time and increment access count
        cached.lastAccess = Date.now();
        this.accessCount++;
        
        return cached.value;
    }
    
    /**
     * Set cached imports for a document URI
     * @param uri Document URI
     * @param imports Import class array to cache
     * @param documentVersion Optional document version
     * @param caretOffset Optional caret offset for position-sensitive caching
     */
    public async set(uri: vscode.Uri, imports: INodeImportClass[], documentVersion?: number, caretOffset?: number): Promise<void> {
        const key = this.generateCacheKey(uri);
        const now = Date.now();
        
        // Check cache size limit and evict if necessary
        if (this.cache.size >= this.maxCacheSize) {
            this.evictLeastRecentlyUsed();
        }
        
        // Generate lightweight content fingerprint if enabled
        let contentFingerprint: string | undefined;
        if (this.enableContentHashing) {
            try {
                const document = await vscode.workspace.openTextDocument(uri);
                // Use document version and file stats for efficient change detection
                const stats = await vscode.workspace.fs.stat(uri);
                // Use the fingerprint directly - it's short and efficient
                contentFingerprint = `${document.version}-${stats.mtime}-${stats.size}`;
            } catch (error) {
                logger.error('Failed to generate content fingerprint:', error);
            }
        }
        
        this.cache.set(key, {
            id: crypto.randomUUID(),
            value: imports,
            timestamp: now,
            lastAccess: now,
            documentVersion,
            contentFingerprint,
            caretOffset
        });
    }
    
    /**
     * Check if a cache entry is expired
     * @param entry Cache entry to check
     * @returns True if expired, false otherwise
     */
    private isExpired(entry: CacheEntry): boolean {
        return Date.now() - entry.timestamp > this.expiryTime;
    }
    
    /**
     * Check if cache is stale based on caret position (similar to CopilotCompletionContextProvider)
     * @param currentCaretOffset Current caret offset
     * @param cachedCaretOffset Cached caret offset
     * @returns True if stale, false otherwise
     */
    private isStaleCacheHit(currentCaretOffset: number, cachedCaretOffset: number): boolean {
        return Math.abs(currentCaretOffset - cachedCaretOffset) > this.maxCaretDistance;
    }
    
    /**
     * Enhanced expiry check including content changes and position sensitivity
     * @param uri Document URI
     * @param entry Cache entry to check
     * @param currentCaretOffset Optional current caret offset
     * @returns True if expired or stale
     */
    private async isExpiredOrStale(uri: vscode.Uri, entry: CacheEntry, currentCaretOffset?: number): Promise<boolean> {
        // Check time-based expiry
        if (this.isExpired(entry)) {
            return true;
        }
        
        // Check position-sensitive expiry if enabled and caret offsets available
        if (this.enablePositionSensitive && 
            entry.caretOffset !== undefined && 
            currentCaretOffset !== undefined) {
            if (this.isStaleCacheHit(currentCaretOffset, entry.caretOffset)) {
                return true;
            }
        }
        
        // Check content-based changes
        if (await this.hasContentChanged(uri, entry)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Evict least recently used cache entries when cache is full
     */
    private evictLeastRecentlyUsed(): void {
        if (this.cache.size === 0) return;
        
        let oldestTime = Date.now();
        let oldestKey = '';
        
        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccess < oldestTime) {
                oldestTime = entry.lastAccess;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.cache.delete(oldestKey);
            logger.trace('Evicted LRU cache entry:', oldestKey);
        }
    }
    
    /**
     * Check if content has changed by comparing lightweight fingerprint
     * @param uri Document URI 
     * @param entry Cache entry to check
     * @returns True if content has changed
     */
    private async hasContentChanged(uri: vscode.Uri, entry: CacheEntry): Promise<boolean> {
        if (!this.enableContentHashing || !entry.contentFingerprint) {
            return false;
        }
        
        try {
            // Fast check using document version first
            const document = await vscode.workspace.openTextDocument(uri);
            if (entry.documentVersion !== undefined && document.version !== entry.documentVersion) {
                return true;
            }
            
            // If document version is the same or not available, check file stats
            const stats = await vscode.workspace.fs.stat(uri);
            const currentFingerprint = `${document.version}-${stats.mtime}-${stats.size}`;
            return currentFingerprint !== entry.contentFingerprint;
        } catch (error) {
            logger.error('Failed to check content change:', error);
            return false;
        }
    }
    
    /**
     * Clear expired cache entries
     */
    public clearExpired(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.expiryTime) {
                this.cache.delete(key);
            }
        }
    }
    
    /**
     * Clear all cache entries
     */
    public clear(): void {
        this.cache.clear();
    }
    
    /**
     * Invalidate cache for specific URI
     * @param uri URI to invalidate
     */
    public invalidate(uri: vscode.Uri): void {
        const key = this.generateCacheKey(uri);
        if (this.cache.has(key)) {
            this.cache.delete(key);
            logger.trace('Cache invalidated for:', uri.toString());
        }
    }
    
    /**
     * Get cache statistics
     * @returns Object containing cache size and other statistics
     */
    public getStats(): { 
        size: number; 
        expiryTime: number;
        accessCount: number;
        maxSize: number;
        hitRate?: number;
        positionSensitive: boolean;
    } {
        return {
            size: this.cache.size,
            expiryTime: this.expiryTime,
            accessCount: this.accessCount,
            maxSize: this.maxCacheSize,
            positionSensitive: this.enablePositionSensitive
        };
    }
    
    /**
     * Start periodic cleanup of expired cache entries
     */
    private startPeriodicCleanup(): void {
        this.cleanupTimer = setInterval(() => {
            this.clearExpired();
        }, this.cleanupIntervalMs);
    }
    
    /**
     * Setup file system watcher for Java files to invalidate cache on changes
     * Optimized to exclude common directories that don't need monitoring
     */
    private setupFileWatcher(): void {
        this.fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.java');
        
        const shouldIgnoreFile = (uri: vscode.Uri): boolean => {
            const path = uri.fsPath.toLowerCase();
            return this.watcherExcludeDirs.some(dir => 
                path.includes(`/${dir}/`) || path.includes(`\\${dir}\\`) ||
                path.includes(`/${dir}`) || path.includes(`\\${dir}`)
            );
        };
        
        const invalidateHandler = (uri: vscode.Uri) => {
            // Skip files in excluded directories for performance
            if (shouldIgnoreFile(uri)) {
                return;
            }
            
            // Apply smart filtering based on configuration
            if (this.watchOnlyCachedFiles) {
                // Only invalidate if we actually have this file cached (more efficient)
                const key = this.generateCacheKey(uri);
                if (this.cache.has(key)) {
                    this.invalidate(uri);
                    logger.trace('Cache invalidated due to file change:', uri.fsPath);
                }
            } else {
                // Invalidate all files (less efficient but more comprehensive)
                this.invalidate(uri);
                logger.trace('Cache invalidated due to file change:', uri.fsPath);
            }
        };
        
        this.fileWatcher.onDidChange(invalidateHandler);
        this.fileWatcher.onDidDelete(invalidateHandler);
    }
    
    /**
     * Dispose of all resources (intervals, watchers, etc.)
     */
    public dispose(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
        
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
            this.fileWatcher = undefined;
        }
        
        this.clear();
    }
}

/**
 * Default context cache instance with performance optimizations
 * Configured for mixed projects (Java + TypeScript/Node.js)
 */
export const contextCache = new ContextCache({
    enableFileWatching: true,
    watchOnlyCachedFiles: true, // Only watch files we actually cache (major performance improvement)
    watcherExcludeDirs: [
        // Standard exclusions for mixed projects
        'node_modules', 'target', 'build', 'out', '.git',
        'bin', '.vscode', '.idea', 'dist', '.next', 'coverage',
        // Additional exclusions for complex projects
        'logs', 'tmp', 'temp', '.cache', '.gradle'
    ],
    expiryTime: 10 * 60 * 1000, // 10 minutes
    maxCacheSize: 100,
    enableContentHashing: true
});
