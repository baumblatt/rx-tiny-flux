import jsonpath from 'jsonpath';

/**
 * Sets a value in an object using a jsonpath expression,
 * creating the nested path if it doesn't exist.
 * This function modifies the input object.
 *
 * @param {object} obj The object to be modified.
 * @param {string} path The jsonpath expression.
 * @param {any} value The value to be set.
 */
export function setValueByPath(obj, path, value) {
    // Tries to set the value. If the path doesn't exist, the `value` function with 3 arguments returns undefined.
    if (jsonpath.value(obj, path, value) === undefined) {
        const pathComponents = jsonpath.parse(path);
        // Removes the last component to get the "parent" path.
        pathComponents.pop();
        const parentPath = jsonpath.stringify(pathComponents);

        // Recursively calls the function to ensure the parent path exists,
        // setting it as an empty object before trying to set the final value.
        setValueByPath(obj, parentPath, {});
        jsonpath.value(obj, path, value);
    }
}