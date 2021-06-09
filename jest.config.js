module.exports = {
  roots: ["<rootDir>"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  testRegex: "test/.*\\.test\\.tsx?$",
  moduleFileExtensions: ["js", "ts"],
  moduleNameMapper: {
    "^src/(.*)": "<rootDir>/src/$1",
  },
  globals: {
    "ts-jest": {
      isolatedModules: true,
    },
  },

  collectCoverageFrom: ["<rootDir>/**/src/**"],
  snapshotSerializers: ["./test/serializers/prettier-serialiser.js", "./test/serializers/graphql-serialiser.js"],
};
