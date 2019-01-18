import * as enzyme from "enzyme";
import * as React from "react";
import Card from "./Card";

it("renders without crashing", () => {
  const component = enzyme.render(<Card cardClass="justAClass" />);
  expect(component);
});
