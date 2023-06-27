// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import * as webviewUI from "@vscode/webview-ui-toolkit";
import * as React from 'react';
import { encodeExternalLinkWithTelemetry } from '../../../../utils/webview';
import { WEBVIEW_ID } from '../../../constants';
const { wrap } = provideReactWrapper(React);

const Link = wrap(webviewUI.VSCodeLink);

class OtherJDKsPanel extends React.Component {
  public render() {
    const jdkList = [
      { name: "Amazon Corretto", url: "https://aws.amazon.com/corretto" },
      { name: "Azul Zulu", url: "https://www.azul.com/downloads/?package=jdk" },
      { name: "Eclipse Adoptium's Temurin", url: "https://adoptium.net/" },
      { name: "IBM Semeru Runtimes", url: "https://developer.ibm.com/languages/java/semeru-runtimes/"},
      { name: "Microsoft Build of OpenJDK", url: "https://www.microsoft.com/openjdk" },
      { name: "Oracle GraalVM", url: "https://www.graalvm.org/downloads/" },
      { name: "Oracle Java SE", url: "https://www.oracle.com/java/technologies/javase-downloads.html" },
      { name: "Red Hat build of OpenJDK", url: "https://developers.redhat.com/products/openjdk/download" },
      { name: "SapMachine", url: "https://sapmachine.io" }
    ];
    return (
      <div>
        <ul className='jdk-distros'>
          {
            jdkList.map((jdk, idx) => <li key={idx}><Link href={encodeExternalLinkWithTelemetry(WEBVIEW_ID, jdk.name, jdk.url)} title={jdk.name}>{jdk.name}</Link></li>)
          }
        </ul>

      </div>
    );
  }
}

export default OtherJDKsPanel;
