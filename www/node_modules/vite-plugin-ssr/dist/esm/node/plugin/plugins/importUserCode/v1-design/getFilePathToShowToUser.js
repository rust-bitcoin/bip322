export { getFilePathToShowToUser };
import { assert } from '../../../utils.js';
function getFilePathToShowToUser(filePath) {
    const filePathToShowToUser = filePath.filePathRelativeToUserRootDir ?? filePath.filePathAbsolute;
    assert(filePathToShowToUser);
    return filePathToShowToUser;
}
