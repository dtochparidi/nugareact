import * as enzyme from "enzyme";
import * as React from "react";

import App from "./App";

it("renders without crashing", () => {
  const component = enzyme.render(<App />);
  expect(component);
});
