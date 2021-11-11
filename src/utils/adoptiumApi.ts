// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as request from "request-promise-native";
import architecture = require("arch");

/**
 * 
 * @returns information about available releases
 * 
 * Sample Response:
 * {
 *   "available_lts_releases": [
 *     8,
 *     11,
 *     17
 *   ],
 *   "available_releases": [
 *     8,
 *     11,
 *     16,
 *     17
 *   ],
 *   "most_recent_feature_release": 17,
 *   "most_recent_feature_version": 17,
 *   "most_recent_lts": 17,
 *   "tip_version": 18
 * }
 */
export async function availableReleases(): Promise<AdoptiumReleaseInfo> {
    const uri = "https://api.adoptium.net/v3/info/available_releases";
    const response = await request.get({
        uri,
        json: true,
        rejectUnauthorized: false 
    })
    return response;
}


/**
 * 
 * @returns list of latest assets for given feature version and jvm impl
 * 
 * Sample Response:
 * [
 *  {
 *     "binary": {
 *       "architecture": "x64",
 *       "download_count": 15116,
 *       "heap_size": "normal",
 *       "image_type": "jdk",
 *       "installer": {
 *         "checksum": "a45c33691f0508a95ff291c88713088e060376e7b4e9cac03d083225b68d8f78",
 *         "checksum_link": "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17%2B35/OpenJDK17-jdk_x64_mac_hotspot_17_35.pkg.sha256.txt",
 *         "download_count": 8857,
 *         "link": "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17%2B35/OpenJDK17-jdk_x64_mac_hotspot_17_35.pkg",
 *         "metadata_link": "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17%2B35/OpenJDK17-jdk_x64_mac_hotspot_17_35.pkg.json",
 *         "name": "OpenJDK17-jdk_x64_mac_hotspot_17_35.pkg",
 *         "size": 192821728
 *       },
 *       "jvm_impl": "hotspot",
 *       "os": "mac",
 *       "package": {
 *         "checksum": "e9de8b1b62780fe99270a5b30f0645d7a91eded60438bcf836a05fa7b93c182f",
 *         "checksum_link": "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17%2B35/OpenJDK17-jdk_x64_mac_hotspot_17_35.tar.gz.sha256.txt",
 *         "download_count": 6259,
 *         "link": "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17%2B35/OpenJDK17-jdk_x64_mac_hotspot_17_35.tar.gz",
 *         "metadata_link": "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17%2B35/OpenJDK17-jdk_x64_mac_hotspot_17_35.tar.gz.json",
 *         "name": "OpenJDK17-jdk_x64_mac_hotspot_17_35.tar.gz",
 *         "size": 192417649
 *       },
 *       "project": "jdk",
 *       "scm_ref": "jdk-17+35_adopt",
 *       "updated_at": "2021-09-22T07:48:28Z"
 *     },
 *     "release_name": "jdk-17+35",
 *     "vendor": "eclipse",
 *     "version": {
 *       "build": 35,
 *       "major": 17,
 *       "minor": 0,
 *       "openjdk_version": "17+35",
 *       "security": 0,
 *       "semver": "17.0.0+35"
 *     }
 *   },
 *   ...
 * ]
 */
export async function latestAssets(featureVersion: string, jvmImpl: string): Promise<AdoptiumAsset[]> {
    let uri = `https://api.adoptium.net/v3/assets/latest/${featureVersion}/${jvmImpl}`;
    const response = await request.get({
        uri,
        json: true,
        // workaround: certificate expired, fixed in Electron v15.1.0
        // see: https://github.com/node-fetch/node-fetch/issues/568#issuecomment-932435180
        rejectUnauthorized: false 
    })
    return response;
}

export async function latestCompatibleAsset(featureVersion: string, jvmImpl: string): Promise<AdoptiumAsset | undefined> {
    const assets = await latestAssets(featureVersion, jvmImpl);
    let os: string = process.platform;
    if (os === "win32") {
        os = "windows";
    } else if (os === "darwin") {
        os = "mac";
    } else {
        os = "linux";
    }

    let arch = architecture();
    if (arch === "x86") {
        arch = "x32";
    }
    return assets.find(a => a.binary.image_type === "jdk" && a.binary.architecture === arch && a.binary.os === os);
}

export interface AdoptiumReleaseInfo {
    available_lts_releases: number[];
    available_releases: number[];
    most_recent_lts: number;
};

export interface AdoptiumAsset {
    release_name: string;
    binary: {
        architecture: string;
        os: string;
        image_type: string;
        installer?: AdoptiumFileMetadata;
        package?: AdoptiumFileMetadata;
    };
    version: {
        major: number;
    }
}

export interface AdoptiumFileMetadata {
    name: string;
    link: string;
    checksum: string;
    size: number;
}