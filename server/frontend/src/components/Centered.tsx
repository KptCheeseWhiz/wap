import React from "react";

import Pad from "components/Pad";

function Centered({
  component: Component,
  children,
  style,
  direction,
  ...props
}: {
  component: any;
  children: any;
  direction: "column" | "row";
  style?: React.CSSProperties;
}) {
  return (
    <Component
      {...props}
      style={{
        ...style,
        display: "flex",
        flexDirection: direction === "column" ? "row" : "column",
      }}
    >
      <Pad />
      <span
        style={{
          display: "flex",
          flexDirection: direction === "column" ? "column" : "row",
        }}
      >
        <Pad />
        {children}
        <Pad />
      </span>
      <Pad />
    </Component>
  );
}

export default Centered;
