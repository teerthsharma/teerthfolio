// Node resolve hook for the site's own modules: its imports are extensionless (the bundler resolves them), node does not.
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (e) {
    if (e.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".")) return next(`${specifier}.js`, context);
    throw e;
  }
}
