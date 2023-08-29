module.exports = {
    extends: [
        'eslint:recommended', 
        'plugin:@typescript-eslint/recommended', 
        'plugin:@typescript-eslint/recommended-type-checked'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    plugins: ['@typescript-eslint'],
    root: true,
    env: {
        node: true
    },
    "rules": {
        "semi": ["error", "always"],
        "@typescript-eslint/no-floating-promises": ["error"],
        "@typescript-eslint/no-misused-promises": ["error"]
    },
    "ignorePatterns": [
      ".eslintrc.cjs", 
      "/node_modules",
      "/dist",
      "/examples"
    ],
};