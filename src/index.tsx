import "./style.scss";

import * as React from "react";
import * as ReactDOM from "react-dom";

import App from "./App";
import BioCardDemo from "./components/BioCard/BioCardDemo";
import PurchasesCardDemo from "./components/PurchasesCard/PurchasesCardDemo";
import registerServiceWorker from "./registerServiceWorker";

const demoMap = {
  bio: <BioCardDemo />,
  purchases: <PurchasesCardDemo />
};

const urlParams = new URLSearchParams(window.location.search);
const demoParam = urlParams.get("demo");

let renderTarget;
if (demoParam !== null && demoParam in demoMap)
  renderTarget = demoMap[demoParam];
else renderTarget = <App />;

ReactDOM.render(renderTarget, document.getElementById("root") as HTMLElement);

registerServiceWorker();
