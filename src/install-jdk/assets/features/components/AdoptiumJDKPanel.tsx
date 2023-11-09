// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Orientation } from '@microsoft/fast-web-utilities';
import { VSCodeRadioGroup, VSCodeRadio, VSCodeButton, VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react";
import { AdoptiumAsset, AdoptiumReleaseInfo } from '../../../../utils/adoptiumApi';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { listReleases, selectVersion, showAsset } from '../installJDKViewSlice';
import { onWillDownloadTemurinJDK, onWillFetchAsset, onWillFetchAvailableReleases } from '../../vscode.api';
import React, { useEffect } from 'react';
import bytes from "bytes";

const AdoptiumJDKPanel = () => {
  const releases = useAppSelector(state => state.jdks.availableReleases);
  const asset = useAppSelector(state => state.jdks.asset); // `undefined` indicates that asset is being fetched...
  const currentVersion = useAppSelector(state => state.jdks.currentVersion);
  const isLoading = releases === undefined || asset === undefined;

  const dispatch = useAppDispatch();
  
  const handleVersionChange = (version: number) => {
    if (!isLoading && currentVersion !== version) {
      dispatch(selectVersion(version));
      dispatch(showAsset(undefined));
    }
  }

  const onMessage = (event: IMessage) => {
    const {data} = event;
    if (data.command === "onDidFetchAvailableReleases") {
      const releaseInfo = data.payload as AdoptiumReleaseInfo;
      dispatch(listReleases(releaseInfo));
    } else if (data.command === "onDidFetchAsset") {
      dispatch(showAsset(data.payload as AdoptiumAsset));
    }
  };

  useEffect(() => {
    window.addEventListener("message", onMessage);
    onWillFetchAvailableReleases();
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (currentVersion && releases) {
      onWillFetchAsset(currentVersion);
    }
  }, [currentVersion, releases]);

  // rendering
  if (releases === undefined) {
    return <VSCodeProgressRing />;
  }

  const versionElements = releases?.available_lts_releases.map((v: number) => {
    return {
      version: v,
      isLts: true,
    };
  }).map((obj: any) => <VSCodeRadio
    key={obj.version}
    defaultChecked={obj.version === releases.most_recent_lts}
    checked={obj.version === currentVersion}
    onClick={() => handleVersionChange(obj.version)}
  >{obj.version}{obj.isLts && " (LTS)"}</VSCodeRadio>);

  const downloadPanel = asset ?
    <div>
      <VSCodeButton onClick={() => downloadJDK(asset)}>
        <div className='btn-download'>
          <div> 
            Download
          </div>
          <div className='asset-info'>
            <div>
              <span>
                {asset.binary.os}-{asset.binary.architecture}
              </span>
            </div>
            <div>
              <span>
                {asset.release_name}
              </span>
              <span> | </span>
              <span>
                {bytes(asset.binary.package?.size || 0, { unitSeparator: " " })}
              </span>
            </div>
          </div>
        </div>
      </VSCodeButton>
    </div>
    : 
    <VSCodeProgressRing />;

  return (
    <div>
      <VSCodeRadioGroup orientation={Orientation.vertical} readOnly={asset===undefined}>
        <label slot="label">Version</label>
        {versionElements}
      </VSCodeRadioGroup>
      <VSCodeRadioGroup orientation={Orientation.vertical} readOnly={asset===undefined}>
        <label slot="label">JVM</label>
        <VSCodeRadio defaultChecked checked>hotspot</VSCodeRadio>
      </VSCodeRadioGroup>
      {downloadPanel}
    </div>
  );
}

function downloadJDK(asset: AdoptiumAsset) {
  const link = asset.binary.installer?.link ?? asset.binary.package?.link;
  if (link) {
    onWillDownloadTemurinJDK(link);
  }
}

interface IMessage {
  data: {
    command: string;
    payload?: AdoptiumReleaseInfo | AdoptiumAsset;
  }
}

export default AdoptiumJDKPanel;
