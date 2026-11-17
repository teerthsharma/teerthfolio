// Gives the _hero test scene every look by id. Imported only on the registry path; one broken look breaks this module.
globalThis.__heroLoadLook = (id) => import(`../../kit/hero/looks/${id}.js`);
