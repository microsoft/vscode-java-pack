// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React from "react";

const SectionHeader = ({title, subTitle}: SectionHeaderProps): JSX.Element => {
  return (
    <div className="setting-section-header">
      <h2 className="setting-section-title">{title}</h2>
      { subTitle && <span>{subTitle}</span> }
    </div>
  );
};

export default SectionHeader;

interface SectionHeaderProps {
  title: string;
  subTitle: string | undefined;
}
