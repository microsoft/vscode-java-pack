// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "@vscode-elements/elements/dist/vscode-button/index.js";
import "@vscode-elements/elements/dist/vscode-progress-ring/index.js";
import "@vscode-elements/elements/dist/vscode-radio-group/index.js";
import "@vscode-elements/elements/dist/vscode-radio/index.js";


import { AdoptiumAsset, AdoptiumReleaseInfo } from '../../../../utils/adoptiumApi';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { listReleases, selectVersion, showAsset } from '../installJDKViewSlice';
import { onWillDownloadTemurinJDK, onWillFetchAsset, onWillFetchAvailableReleases } from '../../vscode.api';
import { useEffect } from 'react';
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
    return <vscode-progress-ring />;
  }

  const versionElements = releases?.available_lts_releases.map((v: number) => {
    return {
      version: v,
      isLts: true,
    };
  }).map((obj: any) => <vscode-radio
    key={obj.version}
    defaultChecked={obj.version === releases.most_recent_lts}
    checked={obj.version === currentVersion}
    onClick={() => handleVersionChange(obj.version)}
  >{obj.version}{obj.isLts && " (LTS)"}</vscode-radio>);

  const downloadPanel = asset ?
    <div>
      <vscode-button onClick={() => downloadJDK(asset)}>
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
      </vscode-button>
    </div>
    : 
    <vscode-progress-ring />;

  return (
    <div>
      <vscode-radio-group orientation="vertical" readOnly={asset===undefined}>
        <label slot="label">Version</label>
        {versionElements}
      </vscode-radio-group>
      <vscode-radio-group orientation="vertical" readOnly={asset===undefined}>
        <label slot="label">JVM</label>
        <vscode-radio defaultChecked checked>hotspot</vscode-radio>
      </vscode-radio-group>
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
