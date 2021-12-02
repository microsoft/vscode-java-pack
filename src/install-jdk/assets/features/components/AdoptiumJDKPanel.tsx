// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Orientation } from '@microsoft/fast-web-utilities';
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import * as webviewUI from "@vscode/webview-ui-toolkit";
import { AdoptiumAsset, AdoptiumReleaseInfo } from '../../../../utils/adoptiumApi';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { listReleases, selectVersion, showAsset } from '../installJDKViewSlice';
import { onWillDownloadTemurinJDK, onWillFetchAsset, onWillFetchAvailableReleases } from '../../vscode.api';
import React, { useEffect } from 'react';
import bytes = require("bytes");

const { wrap } = provideReactWrapper(React);
const RadioGroup = wrap(webviewUI.VSCodeRadioGroup);
const Radio = wrap(webviewUI.VSCodeRadio);
const Button = wrap(webviewUI.VSCodeButton);
const ProgressRing = wrap(webviewUI.VSCodeProgressRing);

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
    return <ProgressRing />;
  }

  const versionElements = releases?.available_lts_releases.map((v: number) => {
    return {
      version: v,
      isLts: true,
    };
  }).map((obj: any) => <Radio
    key={obj.version}
    defaultChecked={obj.version === releases.most_recent_lts}
    checked={obj.version === currentVersion}
    onClick={() => handleVersionChange(obj.version)}
  >{obj.version}{obj.isLts && " (LTS)"}</Radio>);

  const downloadPanel = asset ?
    <div>
      <Button onClick={() => downloadJDK(asset)}>
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
      </Button>
    </div>
    : 
    <ProgressRing />;

  return (
    <div>
      <RadioGroup orientation={Orientation.vertical} readOnly={asset===undefined}>
        <label slot="label">Version</label>
        {versionElements}
      </RadioGroup>
      <RadioGroup orientation={Orientation.vertical} readOnly={asset===undefined}>
        <label slot="label">JVM</label>
        <Radio defaultChecked checked>hotspot</Radio>
      </RadioGroup>
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
