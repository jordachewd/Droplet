import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    settings: {
      react: {
        version: "19.0",
      },
    },
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;
