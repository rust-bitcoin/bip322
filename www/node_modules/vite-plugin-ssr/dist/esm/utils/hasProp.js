export { hasProp };
// - https://2ality.com/2020/06/type-guards-assertion-functions-typescript.html
// - https://www.typescriptlang.org/play?#code/GYVwdgxgLglg9mABDAzgFQJ4AcCmdgAUAbgIYA2IOAXIiWBgDSJTbWIDkARnHGTnewCUNUhRzIUibr35gA3AFgAUKEiwEEzLnzFylGnUbNWNdmBABbTjgBOQkXvGpE5q7cUrw0eElRa8hKL6tPRMLLimKFA2MGAA5vaIQU6SUTHxHqreGn6sOskGocYRHOAA1mBwAO5gickSiOWVNZle6r7oeYGOhUbhbGmxcYgAvKVgFdW1wlI8fHSIAN7KiMiExeIjW+OTNeyIgksrq4g2OFAgNkjRlMcAvsdnF1cb+EmOo9v9Hg9KyhAIKK0GhNKajRAAFgATMplCQUChbFACLltIQSEwzJZrHZBIJ-oCZAA6MhwOIEEj4v6eNQ+WgIpEEAFgAAmMHaIImzTAM3hiJsUEkzLZ7SOShOa0QTIQIp8hyelzAx1WUAAFjZqi4cFVEABRGwamwEdgAQQZArpADESDAyEJlHcgA
import { isCallable } from './isCallable.js';
import { isObject } from './isObject.js';
// prettier-ignore
function hasProp(obj, prop, type = 'unknown') {
    if (!isObject(obj))
        return false;
    if (!(prop in obj)) {
        return type === 'undefined';
    }
    if (type === 'unknown') {
        return true;
    }
    const propValue = obj[prop];
    if (type === 'array') {
        return Array.isArray(propValue);
    }
    if (type === 'object') {
        return isObject(propValue);
    }
    if (type === 'string[]') {
        return Array.isArray(propValue) && propValue.every(el => typeof el === 'string');
    }
    if (type === 'function') {
        return isCallable(propValue);
    }
    if (Array.isArray(type)) {
        return typeof propValue === 'string' && type.includes(propValue);
    }
    if (type === 'null') {
        return propValue === null;
    }
    if (type === 'undefined') {
        return propValue === undefined;
    }
    if (type === 'true') {
        return propValue === true;
    }
    if (type === 'false') {
        return propValue === false;
    }
    return typeof propValue === type;
}
