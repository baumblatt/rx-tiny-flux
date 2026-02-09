import TransferFile from '@zos/ble/TransferFile';
import * as fs from '@zos/fs';

const LARGE_ACTION_MESSAGE_KEY = '__rxTinyFluxLargeAction';
const TRANSFER_STATE_KEY = '_rxTinyFluxTransferState';

const logDebug = (context, message) => {
  if (context && typeof context.debug === 'function') {
    context.debug(message);
  } else if (typeof console !== 'undefined' && typeof console.debug === 'function') {
    console.debug(message);
  }
};

const logError = (context, message, error) => {
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error(message, error);
  } else if (typeof console !== 'undefined' && typeof console.log === 'function') {
    console.log(message, error);
  }
};

const getTransferState = (context) => {
  if (!context) {
    return null;
  }

  if (context[TRANSFER_STATE_KEY]) {
    return context[TRANSFER_STATE_KEY];
  }

  try {
    const transferFile = new TransferFile();
    const state = {
      transferFile,
      inbox: transferFile.getInbox(),
      outbox: transferFile.getOutbox(),
      inboxListenerAttached: false,
      expectedFiles: new Set(),
    };
    context[TRANSFER_STATE_KEY] = state;
    return state;
  } catch (error) {
    logError(context, '[rx-tiny-flux] Failed to initialize TransferFile.', error);
    return null;
  }
};

const createTransferId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const buildFileName = (transferId) => `data://rx-tiny-flux-action-${transferId}.json`;

const decodeToString = (data) => {
  if (typeof data === 'string') {
    return data;
  }

  if (!data) {
    return '';
  }

  if (typeof TextDecoder !== 'undefined') {
    try {
      return new TextDecoder('utf-8').decode(data);
    } catch (error) {
      logDebug(null, `[rx-tiny-flux] TextDecoder failed: ${error?.message || error}`);
    }
  }

  let view = data;
  if (data instanceof ArrayBuffer) {
    view = new Uint8Array(data);
  } else if (ArrayBuffer.isView(data)) {
    view = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }

  let result = '';
  for (let i = 0; i < view.length; i += 1) {
    result += String.fromCharCode(view[i]);
  }
  return result;
};

const writeActionFile = (context, filePath, action) => {
  if (typeof fs.writeFileSync !== 'function') {
    throw new Error('[rx-tiny-flux] writeFileSync is not available in @zos/fs.');
  }
  fs.writeFileSync(filePath, JSON.stringify(action));
  logDebug(context, `[rx-tiny-flux] Stored large action at ${filePath}.`);
};

const readActionFile = (context, filePath) => {
  if (typeof fs.readFileSync !== 'function') {
    throw new Error('[rx-tiny-flux] readFileSync is not available in @zos/fs.');
  }
  const raw = fs.readFileSync(filePath);
  const text = decodeToString(raw);
  return JSON.parse(text);
};

const removeFile = (context, filePath) => {
  if (!filePath) {
    return;
  }

  try {
    if (typeof fs.unlinkSync === 'function') {
      fs.unlinkSync(filePath);
    } else if (typeof fs.rmSync === 'function') {
      fs.rmSync(filePath);
    } else if (typeof fs.removeSync === 'function') {
      fs.removeSync(filePath);
    }
  } catch (error) {
    logDebug(context, `[rx-tiny-flux] Failed to remove file ${filePath}.`);
  }
};

const getFileMeta = (fileObject) => {
  if (!fileObject) {
    return null;
  }

  if (fileObject.meta) {
    return fileObject.meta;
  }

  if (fileObject.metadata) {
    return fileObject.metadata;
  }

  if (fileObject.metaData) {
    return fileObject.metaData;
  }

  if (typeof fileObject.getMetaData === 'function') {
    return fileObject.getMetaData();
  }

  if (typeof fileObject.getMetadata === 'function') {
    return fileObject.getMetadata();
  }

  return null;
};

const getFilePath = (fileObject, fallbackPath) => {
  if (!fileObject) {
    return fallbackPath;
  }

  if (fileObject.filePath) {
    return fileObject.filePath;
  }

  if (fileObject.path) {
    return fileObject.path;
  }

  if (fileObject.fullPath) {
    return fileObject.fullPath;
  }

  if (fileObject.fileName) {
    return fileObject.fileName;
  }

  if (typeof fileObject.getFilePath === 'function') {
    return fileObject.getFilePath();
  }

  return fallbackPath;
};

const dispatchActionFromFile = (context, filePath) => {
  try {
    const action = readActionFile(context, filePath);
    if (action && typeof action.type === 'string') {
      if (typeof context.dispatch === 'function') {
        context.dispatch(action);
      } else {
        logError(context, '[rx-tiny-flux] Dispatch is not available for large action.');
      }
    } else {
      logDebug(context, '[rx-tiny-flux] Ignored large action without a valid type.');
    }
  } catch (error) {
    logError(context, `[rx-tiny-flux] Failed to read large action from ${filePath}.`, error);
  } finally {
    removeFile(context, filePath);
  }
};

export const handleLargeActionMessage = (context, message) => {
  if (!message) {
    return false;
  }

  const payload = message[LARGE_ACTION_MESSAGE_KEY] || (message.type === LARGE_ACTION_MESSAGE_KEY ? message : null);
  if (!payload) {
    return false;
  }

  const state = getTransferState(context);
  if (state) {
    const fileName = payload.fileName || message.fileName;
    if (fileName) {
      state.expectedFiles.add(fileName);
    }
  }

  logDebug(context, '[rx-tiny-flux] Received large action header message.');
  return true;
};

export const setupLargeActionReceiver = (context) => {
  const state = getTransferState(context);
  if (!state || state.inboxListenerAttached) {
    return;
  }

  state.inboxListenerAttached = true;

  state.inbox.on('NEWFILE', () => {
    const fileObject = state.inbox.getNextFile();
    if (!fileObject) {
      return;
    }

    const meta = getFileMeta(fileObject);
    const metaPayload = meta && meta[LARGE_ACTION_MESSAGE_KEY];
    const filePath = getFilePath(fileObject, metaPayload && metaPayload.fileName);
    const isExpected = filePath && state.expectedFiles.has(filePath);
    const isLargeAction = Boolean(metaPayload) || isExpected;

    if (filePath && isExpected) {
      state.expectedFiles.delete(filePath);
    }

    if (!isLargeAction) {
      return;
    }

    const handleTransferred = () => {
      if (filePath) {
        dispatchActionFromFile(context, filePath);
      } else {
        logError(context, '[rx-tiny-flux] Incoming large action has no file path.');
      }
    };

    const handleError = () => {
      if (filePath) {
        removeFile(context, filePath);
      }
    };

    if (typeof fileObject.on === 'function') {
      fileObject.on('change', (event) => {
        const readyState = event && event.data && event.data.readyState;
        if (readyState === 'transferred') {
          handleTransferred();
        } else if (readyState === 'error') {
          handleError();
        }
      });
    }

    if (fileObject.readyState === 'transferred') {
      handleTransferred();
    }
  });
};

export const enqueueLargeActionTransfer = (action, context) => {
  if (!context) {
    return false;
  }

  const state = getTransferState(context);
  if (!state) {
    return false;
  }

  const transferId = createTransferId();
  const fileName = buildFileName(transferId);
  const payload = {
    transferId,
    fileName,
    actionType: action && action.type,
  };

  try {
    writeActionFile(context, fileName, action);
  } catch (error) {
    logError(context, '[rx-tiny-flux] Failed to store large action on disk.', error);
    return false;
  }

  if (typeof context.call === 'function') {
    context.call({ [LARGE_ACTION_MESSAGE_KEY]: payload });
  }

  let fileObject;
  try {
    fileObject = state.outbox.enqueueFile(fileName, { [LARGE_ACTION_MESSAGE_KEY]: payload });
  } catch (error) {
    logError(context, '[rx-tiny-flux] Failed to enqueue file for transfer.', error);
    removeFile(context, fileName);
    return false;
  }

  if (fileObject && typeof fileObject.on === 'function') {
    fileObject.on('change', (event) => {
      const readyState = event && event.data && event.data.readyState;
      if (readyState === 'transferred' || readyState === 'error') {
        removeFile(context, fileName);
      }
    });
  }

  return true;
};
