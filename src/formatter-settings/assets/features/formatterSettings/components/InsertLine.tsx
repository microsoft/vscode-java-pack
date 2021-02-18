// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React from "react";
import { useSelector} from "react-redux";
import { Catagory, JavaFormatterSetting } from "../../../../types";
import Setting from "./Setting";

const InsertLine = (): JSX.Element => {
  const settings: JavaFormatterSetting[] = useSelector((state: any) => state.formatterSettings.settings);

  return (
    <Setting setting={settings} catagory={Catagory.InsertLine}/>
  );
};

export default InsertLine;
