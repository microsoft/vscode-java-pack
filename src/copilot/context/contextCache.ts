/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { INodeImportClass } from './copilotHelper';

/**
 * Cache entry interface for storing import data with timestamp
 */
interface CacheEntry {
    value: INodeImportClass[];
    timestamp: number;
}

/**
 * Configuration options for the context cache
 */
interface ContextCacheOptions {
    /** Cache expiry time in milliseconds. Default: 5 minutes */
    expiryTime?: number;
    /** Enable automatic cleanup interval. Default: true */
    enableAutoCleanup?: boolean;
    /** Enable file watching for cache invalidation. Default: true */
    enableFileWatching?: boolean;
}

/**
 * Context cache manager for storing and managing Java import contexts
 */
export class ContextCache {
    private readonly cache = new Map<string, CacheEntry>();
    private readonly expiryTime: number;
    private readonly enableAutoCleanup: boolean;
    private readonly enableFileWatching: boolean;
    
    private cleanupInterval?: NodeJS.Timeout;
    private fileWatcher?: vscode.FileSystemWatcher;
    
    constructor(options: ContextCacheOptions = {}) {
        this.expiryTime = options.expiryTime ?? 5 * 60 * 1000; // 5 minutes default
        this.enableAutoCleanup = options.enableAutoCleanup ?? true;
        this.enableFileWatching = options.enableFileWatching ?? true;
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
     * @param uri Document URI
     * @returns Hashed URI string
     */
    private generateCacheKey(uri: vscode.Uri): string {
        return crypto.createHash('md5').update(uri.toString()).digest('hex');
    }
    
    /**
     * Get cached imports for a document URI
     * @param uri Document URI
     * @returns Cached imports or null if not found/expired
     */
    public get(uri: vscode.Uri): INodeImportClass[] | null {
        const key = this.generateCacheKey(uri);
        const cached = this.cache.get(key);
        
        if (!cached) {
            return null;
        }
        
        // Check if cache is expired
        if (this.isExpired(cached)) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.value;
    }
    
    /**
     * Set cached imports for a document URI
     * @param uri Document URI
     * @param imports Import class array to cache
     */
    public set(uri: vscode.Uri, imports: INodeImportClass[]): void {
        const key = this.generateCacheKey(uri);
        this.cache.set(key, {
            value: imports,
            timestamp: Date.now()
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
            console.log('======== Cache invalidated for:', uri.toString());
        }
    }
    
    /**
     * Get cache statistics
     * @returns Object containing cache size and other statistics
     */
    public getStats(): { size: number; expiryTime: number } {
        return {
            size: this.cache.size,
            expiryTime: this.expiryTime
        };
    }
    
    /**
     * Start periodic cleanup of expired cache entries
     */
    private startPeriodicCleanup(): void {
        this.cleanupInterval = setInterval(() => {
            this.clearExpired();
        }, this.expiryTime);
    }
    
    /**
     * Setup file system watcher for Java files to invalidate cache on changes
     */
    private setupFileWatcher(): void {
        this.fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.java');
        
        const invalidateHandler = (uri: vscode.Uri) => {
            this.invalidate(uri);
        };
        
        this.fileWatcher.onDidChange(invalidateHandler);
        this.fileWatcher.onDidDelete(invalidateHandler);
    }
    
    /**
     * Dispose of all resources (intervals, watchers, etc.)
     */
    public dispose(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
        
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
            this.fileWatcher = undefined;
        }
        
        this.clear();
    }
}

/**
 * Default context cache instance
 */
export const contextCache = new ContextCache();
