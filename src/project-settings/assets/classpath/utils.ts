// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export const WEBVIEW_ID = "java.classpathConfiguration";

// TODO: better way to handle the max height calculation?
export const updateMaxHeight = () => {
  let maxHeight = window.innerHeight;
  const projectSelector = document.getElementById("project-selector");
  if (projectSelector) {
    maxHeight -= projectSelector.getBoundingClientRect().height;
  }
  const hinter = document.getElementById("hint");
  if (hinter) {
    maxHeight -= hinter.getBoundingClientRect().height;
  }
  const footer = document.getElementById("footer");
  if (footer) {
    maxHeight -= footer.getBoundingClientRect().height;
  }
  maxHeight -= 120;
  const areas = Array.from(document.getElementsByClassName("setting-overflow-area") as HTMLCollectionOf<HTMLElement>);
  for (let i = 0; i < areas.length; i++) {
    areas[i].style!.maxHeight = (maxHeight <= 10 ? 10 : maxHeight) + "px";
  }
}
