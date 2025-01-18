var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};

// node_modules/.pnpm/kkrpc@0.0.13_typescript@5.6.3/node_modules/kkrpc/dist/chunk-XU7DWWSJ.js
var DESTROY_SIGNAL = "__DESTROY__";
var WorkerChildIO = class {
  name = "worker-child-io";
  messageQueue = [];
  resolveRead = null;
  constructor() {
    self.onmessage = this.handleMessage;
  }
  handleMessage = (event) => {
    const message = event.data;
    if (message === DESTROY_SIGNAL) {
      this.destroy();
      return;
    }
    if (this.resolveRead) {
      this.resolveRead(message);
      this.resolveRead = null;
    } else {
      this.messageQueue.push(message);
    }
  };
  async read() {
    if (this.messageQueue.length > 0) {
      return this.messageQueue.shift() ?? null;
    }
    return new Promise((resolve) => {
      this.resolveRead = resolve;
    });
  }
  async write(data) {
    self.postMessage(data);
  }
  destroy() {
    self.postMessage(DESTROY_SIGNAL);
    self.close();
  }
  signalDestroy() {
    self.postMessage(DESTROY_SIGNAL);
  }
};

// node_modules/.pnpm/kkrpc@0.0.13_typescript@5.6.3/node_modules/kkrpc/dist/chunk-KUE6DDOO.js
function serializeMessage(message) {
  return JSON.stringify(message) + `
`;
}
function deserializeMessage(message) {
  return new Promise((resolve, reject) => {
    try {
      const parsed = JSON.parse(message);
      resolve(parsed);
    } catch (error) {
      console.error("failed to parse message", typeof message, message, error);
      reject(error);
    }
  });
}
function generateUUID() {
  return new Array(4).fill(0).map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)).join("-");
}
var RPCChannel = class {
  constructor(io, options) {
    this.io = io;
    this.apiImplementation = options?.expose;
    this.listen();
  }
  pendingRequests = {};
  callbacks = {};
  callbackCache = /* @__PURE__ */ new Map;
  count = 0;
  messageStr = "";
  apiImplementation;
  expose(api) {
    this.apiImplementation = api;
  }
  getIO() {
    return this.io;
  }
  async listen() {
    while (true) {
      const buffer = await this.io.read();
      if (!buffer) {
        continue;
      }
      const bufferStr = buffer.toString("utf-8");
      if (bufferStr.trim().length === 0) {
        continue;
      }
      this.messageStr += bufferStr;
      const lastChar = this.messageStr[this.messageStr.length - 1];
      const msgsSplit = this.messageStr.split(`
`);
      const msgs = lastChar === `
` ? msgsSplit : msgsSplit.slice(0, -1);
      this.messageStr = lastChar === `
` ? "" : msgsSplit.at(-1) ?? "";
      for (const msgStr of msgs.map((msg) => msg.trim()).filter(Boolean)) {
        this.handleMessageStr(msgStr);
      }
    }
  }
  async handleMessageStr(messageStr) {
    this.count++;
    const parsedMessage = await deserializeMessage(messageStr);
    if (parsedMessage.type === "response") {
      this.handleResponse(parsedMessage);
    } else if (parsedMessage.type === "request") {
      this.handleRequest(parsedMessage);
    } else if (parsedMessage.type === "callback") {
      this.handleCallback(parsedMessage);
    } else {
      console.error("received unknown message type", parsedMessage, typeof parsedMessage);
    }
  }
  callMethod(method, args) {
    return new Promise((resolve, reject) => {
      const messageId = generateUUID();
      this.pendingRequests[messageId] = { resolve, reject };
      const callbackIds = [];
      const processedArgs = args.map((arg) => {
        if (typeof arg === "function") {
          let callbackId = this.callbackCache.get(arg);
          if (!callbackId) {
            callbackId = generateUUID();
            this.callbacks[callbackId] = arg;
            this.callbackCache.set(arg, callbackId);
          } else {
          }
          callbackIds.push(callbackId);
          return `__callback__${callbackId}`;
        }
        return arg;
      });
      const message = {
        id: messageId,
        method,
        args: processedArgs,
        type: "request",
        callbackIds: callbackIds.length > 0 ? callbackIds : undefined
      };
      this.io.write(serializeMessage(message));
    });
  }
  handleResponse(response) {
    const { id } = response;
    const { result, error } = response.args;
    if (this.pendingRequests[id]) {
      if (error) {
        this.pendingRequests[id].reject(new Error(error));
      } else {
        this.pendingRequests[id].resolve(result);
      }
      delete this.pendingRequests[id];
    }
  }
  handleRequest(request) {
    const { id, method, args } = request;
    const methodPath = method.split(".");
    if (!this.apiImplementation)
      return;
    let target = this.apiImplementation;
    for (let i = 0;i < methodPath.length - 1; i++) {
      target = target[methodPath[i]];
      if (!target) {
        this.sendError(id, `Method path ${method} not found at ${methodPath[i]}`);
        return;
      }
    }
    const finalMethod = methodPath[methodPath.length - 1];
    const targetMethod = target[finalMethod];
    if (typeof targetMethod !== "function") {
      this.sendError(id, `Method ${method} is not a function`);
      return;
    }
    const processedArgs = args.map((arg) => {
      if (typeof arg === "string" && arg.startsWith("__callback__")) {
        const callbackId = arg.slice(12);
        return (...callbackArgs) => {
          this.invokeCallback(callbackId, callbackArgs);
        };
      }
      return arg;
    });
    try {
      const result = targetMethod.apply(target, processedArgs);
      Promise.resolve(result).then((res) => {
        return this.sendResponse(id, res);
      }).catch((err) => this.sendError(id, err.message));
    } catch (error) {
      this.sendError(id, error.message ?? error.toString());
    }
  }
  invokeCallback(callbackId, args) {
    const message = {
      id: generateUUID(),
      method: callbackId,
      args,
      type: "callback"
    };
    this.io.write(serializeMessage(message));
  }
  handleCallback(message) {
    const { method: callbackId, args } = message;
    const callback = this.callbacks[callbackId];
    if (callback) {
      callback(...args);
    } else {
      console.error(`Callback with id ${callbackId} not found`);
    }
  }
  sendResponse(id, result) {
    const response = {
      id,
      method: "",
      args: { result },
      type: "response"
    };
    this.io.write(serializeMessage(response));
  }
  sendError(id, error) {
    const response = {
      id,
      method: "",
      args: { error },
      type: "response"
    };
    this.io.write(serializeMessage(response));
  }
  createNestedProxy(chain = []) {
    return new Proxy(() => {
    }, {
      get: (_target, prop) => {
        if (typeof prop === "string" && prop !== "then") {
          return this.createNestedProxy([...chain, prop]);
        }
        return;
      },
      apply: (_target, _thisArg, args) => {
        const method = chain.join(".");
        return this.callMethod(method, args);
      }
    });
  }
  getAPI() {
    return this.createNestedProxy();
  }
  freeCallbacks() {
    this.callbacks = {};
    this.callbackCache.clear();
  }
};

// node_modules/.pnpm/@tauri-apps+api@2.1.1/node_modules/@tauri-apps/api/external/tslib/tslib.es6.js
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m")
    throw new TypeError("Private method is not writable");
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}

// node_modules/.pnpm/@tauri-apps+api@2.1.1/node_modules/@tauri-apps/api/core.js
var _Channel_onmessage;
var _Channel_nextMessageId;
var _Channel_pendingMessages;
var _Resource_rid;
var SERIALIZE_TO_IPC_FN = "__TAURI_TO_IPC_KEY__";
function transformCallback(callback, once = false) {
  return window.__TAURI_INTERNALS__.transformCallback(callback, once);
}

class Channel {
  constructor() {
    this.__TAURI_CHANNEL_MARKER__ = true;
    _Channel_onmessage.set(this, () => {
    });
    _Channel_nextMessageId.set(this, 0);
    _Channel_pendingMessages.set(this, {});
    this.id = transformCallback(({ message, id }) => {
      if (id === __classPrivateFieldGet(this, _Channel_nextMessageId, "f")) {
        __classPrivateFieldSet(this, _Channel_nextMessageId, id + 1, "f");
        __classPrivateFieldGet(this, _Channel_onmessage, "f").call(this, message);
        const pendingMessageIds = Object.keys(__classPrivateFieldGet(this, _Channel_pendingMessages, "f"));
        if (pendingMessageIds.length > 0) {
          let nextId = id + 1;
          for (const pendingId of pendingMessageIds.sort()) {
            if (parseInt(pendingId) === nextId) {
              const message2 = __classPrivateFieldGet(this, _Channel_pendingMessages, "f")[pendingId];
              delete __classPrivateFieldGet(this, _Channel_pendingMessages, "f")[pendingId];
              __classPrivateFieldGet(this, _Channel_onmessage, "f").call(this, message2);
              nextId += 1;
            } else {
              break;
            }
          }
          __classPrivateFieldSet(this, _Channel_nextMessageId, nextId, "f");
        }
      } else {
        __classPrivateFieldGet(this, _Channel_pendingMessages, "f")[id.toString()] = message;
      }
    });
  }
  set onmessage(handler) {
    __classPrivateFieldSet(this, _Channel_onmessage, handler, "f");
  }
  get onmessage() {
    return __classPrivateFieldGet(this, _Channel_onmessage, "f");
  }
  [(_Channel_onmessage = new WeakMap, _Channel_nextMessageId = new WeakMap, _Channel_pendingMessages = new WeakMap, SERIALIZE_TO_IPC_FN)]() {
    return `__CHANNEL__:${this.id}`;
  }
  toJSON() {
    return this[SERIALIZE_TO_IPC_FN]();
  }
}
_Resource_rid = new WeakMap;

// node_modules/.pnpm/@tauri-apps+api@2.1.1/node_modules/@tauri-apps/api/event.js
var TauriEvent;
(function(TauriEvent2) {
  TauriEvent2["WINDOW_RESIZED"] = "tauri://resize";
  TauriEvent2["WINDOW_MOVED"] = "tauri://move";
  TauriEvent2["WINDOW_CLOSE_REQUESTED"] = "tauri://close-requested";
  TauriEvent2["WINDOW_DESTROYED"] = "tauri://destroyed";
  TauriEvent2["WINDOW_FOCUS"] = "tauri://focus";
  TauriEvent2["WINDOW_BLUR"] = "tauri://blur";
  TauriEvent2["WINDOW_SCALE_FACTOR_CHANGED"] = "tauri://scale-change";
  TauriEvent2["WINDOW_THEME_CHANGED"] = "tauri://theme-changed";
  TauriEvent2["WINDOW_CREATED"] = "tauri://window-created";
  TauriEvent2["WEBVIEW_CREATED"] = "tauri://webview-created";
  TauriEvent2["DRAG_ENTER"] = "tauri://drag-enter";
  TauriEvent2["DRAG_OVER"] = "tauri://drag-over";
  TauriEvent2["DRAG_DROP"] = "tauri://drag-drop";
  TauriEvent2["DRAG_LEAVE"] = "tauri://drag-leave";
})(TauriEvent || (TauriEvent = {}));
// node_modules/.pnpm/@tauri-apps+api@2.1.1/node_modules/@tauri-apps/api/path.js
var BaseDirectory;
(function(BaseDirectory2) {
  BaseDirectory2[BaseDirectory2["Audio"] = 1] = "Audio";
  BaseDirectory2[BaseDirectory2["Cache"] = 2] = "Cache";
  BaseDirectory2[BaseDirectory2["Config"] = 3] = "Config";
  BaseDirectory2[BaseDirectory2["Data"] = 4] = "Data";
  BaseDirectory2[BaseDirectory2["LocalData"] = 5] = "LocalData";
  BaseDirectory2[BaseDirectory2["Document"] = 6] = "Document";
  BaseDirectory2[BaseDirectory2["Download"] = 7] = "Download";
  BaseDirectory2[BaseDirectory2["Picture"] = 8] = "Picture";
  BaseDirectory2[BaseDirectory2["Public"] = 9] = "Public";
  BaseDirectory2[BaseDirectory2["Video"] = 10] = "Video";
  BaseDirectory2[BaseDirectory2["Resource"] = 11] = "Resource";
  BaseDirectory2[BaseDirectory2["Temp"] = 12] = "Temp";
  BaseDirectory2[BaseDirectory2["AppConfig"] = 13] = "AppConfig";
  BaseDirectory2[BaseDirectory2["AppData"] = 14] = "AppData";
  BaseDirectory2[BaseDirectory2["AppLocalData"] = 15] = "AppLocalData";
  BaseDirectory2[BaseDirectory2["AppCache"] = 16] = "AppCache";
  BaseDirectory2[BaseDirectory2["AppLog"] = 17] = "AppLog";
  BaseDirectory2[BaseDirectory2["Desktop"] = 18] = "Desktop";
  BaseDirectory2[BaseDirectory2["Executable"] = 19] = "Executable";
  BaseDirectory2[BaseDirectory2["Font"] = 20] = "Font";
  BaseDirectory2[BaseDirectory2["Home"] = 21] = "Home";
  BaseDirectory2[BaseDirectory2["Runtime"] = 22] = "Runtime";
  BaseDirectory2[BaseDirectory2["Template"] = 23] = "Template";
})(BaseDirectory || (BaseDirectory = {}));

// node_modules/.pnpm/@tauri-apps+plugin-log@2.2.0/node_modules/@tauri-apps/plugin-log/dist-js/index.js
var LogLevel;
(function(LogLevel2) {
  LogLevel2[LogLevel2["Trace"] = 1] = "Trace";
  LogLevel2[LogLevel2["Debug"] = 2] = "Debug";
  LogLevel2[LogLevel2["Info"] = 3] = "Info";
  LogLevel2[LogLevel2["Warn"] = 4] = "Warn";
  LogLevel2[LogLevel2["Error"] = 5] = "Error";
})(LogLevel || (LogLevel = {}));

// node_modules/.pnpm/tauri-api-adapter@0.3.16_typescript@5.6.3/node_modules/tauri-api-adapter/dist/api/client/fetch/request.js
function constructFetchAPI(api) {
  return async function fetch(input, init) {
    console.log("fetch", input, init);
    const maxRedirections = init?.maxRedirections;
    const connectTimeout = init?.connectTimeout;
    const proxy = init?.proxy;
    if (init != null) {
      delete init.maxRedirections;
      delete init.connectTimeout;
      delete init.proxy;
    }
    const signal = init?.signal;
    const headers = init?.headers == null ? [] : init.headers instanceof Headers ? Array.from(init.headers.entries()) : Array.isArray(init.headers) ? init.headers : Object.entries(init.headers);
    const mappedHeaders = headers.map(([name, val]) => [
      name,
      typeof val === "string" ? val : val.toString()
    ]);
    const req = new Request(input, init);
    const buffer = await req.arrayBuffer();
    const reqData = buffer.byteLength !== 0 ? Array.from(new Uint8Array(buffer)) : null;
    const rid = await api.rawFetch({
      clientConfig: {
        method: req.method,
        url: req.url,
        headers: mappedHeaders,
        data: reqData,
        maxRedirections,
        connectTimeout,
        proxy
      }
    });
    signal?.addEventListener("abort", () => {
      api.fetchCancel(rid);
    });
    const { status, statusText, url, headers: responseHeaders, rid: responseRid } = await api.fetchSend(rid);
    const body = await api.fetchReadBody(responseRid);
    const res = new Response(body instanceof ArrayBuffer && body.byteLength !== 0 ? body : body instanceof Array && body.length > 0 ? new Uint8Array(body) : null, {
      headers: responseHeaders,
      status,
      statusText
    });
    Object.defineProperty(res, "url", { value: url });
    return res;
  };
}
// node_modules/.pnpm/tauri-plugin-shellx-api@2.0.14/node_modules/tauri-plugin-shellx-api/dist-js/index.js
class EventEmitter {
  constructor() {
    this.eventListeners = Object.create(null);
  }
  addListener(eventName, listener) {
    return this.on(eventName, listener);
  }
  removeListener(eventName, listener) {
    return this.off(eventName, listener);
  }
  on(eventName, listener) {
    if (eventName in this.eventListeners) {
      this.eventListeners[eventName].push(listener);
    } else {
      this.eventListeners[eventName] = [listener];
    }
    return this;
  }
  once(eventName, listener) {
    const wrapper = (arg) => {
      this.removeListener(eventName, wrapper);
      listener(arg);
    };
    return this.addListener(eventName, wrapper);
  }
  off(eventName, listener) {
    if (eventName in this.eventListeners) {
      this.eventListeners[eventName] = this.eventListeners[eventName].filter((l) => l !== listener);
    }
    return this;
  }
  removeAllListeners(event) {
    if (event) {
      delete this.eventListeners[event];
    } else {
      this.eventListeners = Object.create(null);
    }
    return this;
  }
  emit(eventName, arg) {
    if (eventName in this.eventListeners) {
      const listeners = this.eventListeners[eventName];
      for (const listener of listeners)
        listener(arg);
      return true;
    }
    return false;
  }
  listenerCount(eventName) {
    if (eventName in this.eventListeners)
      return this.eventListeners[eventName].length;
    return 0;
  }
  prependListener(eventName, listener) {
    if (eventName in this.eventListeners) {
      this.eventListeners[eventName].unshift(listener);
    } else {
      this.eventListeners[eventName] = [listener];
    }
    return this;
  }
  prependOnceListener(eventName, listener) {
    const wrapper = (arg) => {
      this.removeListener(eventName, wrapper);
      listener(arg);
    };
    return this.prependListener(eventName, wrapper);
  }
}
// node_modules/.pnpm/tauri-api-adapter@0.3.16_typescript@5.6.3/node_modules/tauri-api-adapter/dist/api/client/updownload.js
function constructUpdownloadAPI(api) {
  return {
    upload: (url, filePath, progressHandler, headers) => api.upload(url, filePath, progressHandler ? progressHandler : undefined, headers),
    download: (url, filePath, progressHandler, headers) => api.download(url, filePath, progressHandler ? progressHandler : undefined, headers)
  };
}
// node_modules/.pnpm/@kksh+api@0.0.48_svelte@5.1.16_typescript@5.6.3/node_modules/@kksh/api/src/api/event.ts
function constructEventAPI2(api) {
  return {
    onDragDrop: (callback) => api.onDragDrop(callback),
    onDragEnter: (callback) => api.onDragEnter(callback),
    onDragLeave: (callback) => api.onDragLeave(callback),
    onDragOver: (callback) => api.onDragOver(callback),
    onWindowBlur: (callback) => api.onWindowBlur(callback),
    onWindowCloseRequested: (callback) => api.onWindowCloseRequested(callback),
    onWindowFocus: (callback) => api.onWindowFocus(callback)
  };
}

// node_modules/.pnpm/@kksh+api@0.0.48_svelte@5.1.16_typescript@5.6.3/node_modules/@kksh/api/src/api/path.ts
function constructPathAPI2(api) {
  return {
    BaseDirectory,
    appCacheDir: api.appCacheDir,
    appConfigDir: api.appConfigDir,
    appDataDir: api.appDataDir,
    appLocalDataDir: api.appLocalDataDir,
    appLogDir: api.appLogDir,
    audioDir: api.audioDir,
    basename: api.basename,
    cacheDir: api.cacheDir,
    configDir: api.configDir,
    dataDir: api.dataDir,
    delimiter: api.delimiter,
    desktopDir: api.desktopDir,
    dirname: api.dirname,
    documentDir: api.documentDir,
    downloadDir: api.downloadDir,
    executableDir: api.executableDir,
    extname: api.extname,
    fontDir: api.fontDir,
    homeDir: api.homeDir,
    isAbsolute: api.isAbsolute,
    join: api.join,
    localDataDir: api.localDataDir,
    normalize: api.normalize,
    pictureDir: api.pictureDir,
    publicDir: api.publicDir,
    resolve: api.resolve,
    resolveResource: api.resolveResource,
    resourceDir: api.resourceDir,
    runtimeDir: api.runtimeDir,
    sep: api.sep,
    tempDir: api.tempDir,
    templateDir: api.templateDir,
    videoDir: api.videoDir,
    extensionDir: api.extensionDir,
    extensionSupportDir: api.extensionSupportDir
  };
}

// node_modules/.pnpm/@kksh+api@0.0.48_svelte@5.1.16_typescript@5.6.3/node_modules/@kksh/api/src/api/shell.ts
class Child2 {
  pid;
  api;
  constructor(pid, api) {
    this.pid = pid;
    this.api = api;
  }
  async write(data) {
    this.api.stdinWrite(data.toString(), this.pid);
  }
  async kill() {
    this.api.kill(this.pid);
  }
}

class BaseShellCommand extends EventEmitter {
  program;
  args;
  options;
  stdout = new EventEmitter;
  stderr = new EventEmitter;
  constructor(program, args = [], options) {
    super();
    this.program = program;
    this.args = typeof args === "string" ? [args] : args;
    this.options = options ?? {};
  }
}

class Command2 extends BaseShellCommand {
  api;
  constructor(program, args = [], api, options) {
    super(program, args, options);
    this.api = api;
  }
  async spawn() {
    const args = this.args;
    if (typeof args === "object") {
      Object.freeze(args);
    }
    return this.api.rawSpawn(this.program, args, this.options, (evt) => {
      switch (evt.event) {
        case "Error":
          this.emit("error", evt.payload);
          break;
        case "Terminated":
          this.emit("close", evt.payload);
          break;
        case "Stdout":
          this.stdout.emit("data", evt.payload);
          break;
        case "Stderr":
          this.stderr.emit("data", evt.payload);
          break;
      }
    }).then(async (pid) => {
      await this.api.recordSpawnedProcess(pid);
      return new Child2(pid, this.api);
    });
  }
  async execute() {
    const args = this.args;
    if (typeof args === "object") {
      Object.freeze(args);
    }
    return this.api.execute(this.program, this.args, this.options);
  }
}

class DenoCommand extends BaseShellCommand {
  config;
  scriptPath;
  api;
  constructor(scriptPath, args, config, api) {
    super("deno", args);
    this.config = config;
    this.scriptPath = scriptPath;
    this.api = api;
  }
  execute() {
    return this.api.denoExecute(this.scriptPath, this.config, this.args);
  }
  spawn() {
    return this.api.denoRawSpawn(this.scriptPath, this.config, this.args, (evt) => {
      switch (evt.event) {
        case "Error":
          this.emit("error", evt.payload);
          break;
        case "Terminated":
          this.emit("close", evt.payload);
          break;
        case "Stdout":
          this.stdout.emit("data", evt.payload);
          break;
        case "Stderr":
          this.stderr.emit("data", evt.payload);
          break;
      }
    }).then(async (pid) => {
      await this.api.recordSpawnedProcess(pid);
      return new Child2(pid, this.api);
    });
  }
}

class TauriShellStdio {
  readStream;
  childProcess;
  name = "tauri-shell-stdio";
  constructor(readStream, childProcess) {
    this.readStream = readStream;
    this.childProcess = childProcess;
  }
  read() {
    return new Promise((resolve, reject) => {
      this.readStream.on("data", (chunk) => {
        resolve(chunk);
      });
    });
  }
  async write(data) {
    return this.childProcess.write(data + `
`);
  }
}
function constructShellAPI2(api) {
  function createCommand(program, args = [], options) {
    return new Command2(program, args, api, options);
  }
  function createDenoCommand(scriptPath, args, config) {
    return new DenoCommand(scriptPath, args, config, api);
  }
  async function createDenoRpcChannel(scriptPath, args, config, localAPIImplementation) {
    const denoCmd = createDenoCommand(scriptPath, args, config);
    const denoProcess = await denoCmd.spawn();
    const stdio = new TauriShellStdio(denoCmd.stdout, denoProcess);
    const stdioRPC = new RPCChannel(stdio, { expose: localAPIImplementation });
    return {
      rpcChannel: stdioRPC,
      process: denoProcess,
      command: denoCmd
    };
  }
  function makeBashScript(script) {
    return createCommand("bash", ["-c", script]);
  }
  function makePowershellScript(script) {
    return createCommand("powershell", ["-Command", script]);
  }
  function makeAppleScript(script) {
    return createCommand("osascript", ["-e", script]);
  }
  function makePythonScript(script) {
    return createCommand("python", ["-c", script]);
  }
  function makeZshScript(script) {
    return createCommand("zsh", ["-c", script]);
  }
  function makeNodeScript(script) {
    return createCommand("node", ["-e", script]);
  }
  async function executeBashScript(script) {
    return makeBashScript(script).execute();
  }
  async function executePowershellScript(script) {
    return makePowershellScript(script).execute();
  }
  async function executeAppleScript(script) {
    return makeAppleScript(script).execute();
  }
  async function executePythonScript(script) {
    return makePythonScript(script).execute();
  }
  async function executeZshScript(script) {
    return makeZshScript(script).execute();
  }
  async function executeNodeScript(script) {
    return makeNodeScript(script).execute();
  }
  function likelyOnWindows2() {
    return api.likelyOnWindows();
  }
  return {
    open: api.open,
    makeBashScript,
    makePowershellScript,
    makeAppleScript,
    makePythonScript,
    makeZshScript,
    makeNodeScript,
    executeBashScript,
    executePowershellScript,
    executeAppleScript,
    executePythonScript,
    executeZshScript,
    executeNodeScript,
    hasCommand: api.hasCommand,
    likelyOnWindows: likelyOnWindows2,
    createCommand,
    createDenoCommand,
    Child: Child2,
    TauriShellStdio,
    createDenoRpcChannel,
    RPCChannel,
    whereIsCommand: api.whereIsCommand
  };
}

// node_modules/.pnpm/@kksh+api@0.0.48_svelte@5.1.16_typescript@5.6.3/node_modules/@kksh/api/src/api/toast.ts
function constructToastAPI(api) {
  return {
    message: (message, options, action) => api.message(message, options, action ? action : undefined),
    info: (message, options, action) => api.info(message, options, action ? action : undefined),
    success: (message, options, action) => api.success(message, options, action ? action : undefined),
    warning: (message, options, action) => api.warning(message, options, action ? action : undefined),
    error: (message, options, action) => api.error(message, options, action ? action : undefined)
  };
}

// node_modules/.pnpm/@kksh+api@0.0.48_svelte@5.1.16_typescript@5.6.3/node_modules/@kksh/api/src/ui/worker/ext.ts
class WorkerExtension {
  searchTerm = "";
  highlightedListItemValue;
  onSearchTermChange(term) {
    this.searchTerm = term;
    return Promise.resolve();
  }
  onActionSelected(value) {
    return Promise.resolve();
  }
  onEnterPressedOnSearchBar() {
    return Promise.resolve();
  }
  onFilesDropped(paths) {
    return Promise.resolve();
  }
  onBeforeGoBack() {
    return Promise.resolve();
  }
  onListItemSelected(value) {
    return Promise.resolve();
  }
  onListScrolledToBottom() {
    return Promise.resolve();
  }
  onHighlightedListItemChanged(value) {
    this.highlightedListItemValue = value;
    return Promise.resolve();
  }
  onFormSubmit(value) {
    return Promise.resolve();
  }
}
// node_modules/.pnpm/valibot@1.0.0-beta.11_typescript@5.6.3/node_modules/valibot/dist/index.js
var store;
function getGlobalConfig(config2) {
  return {
    lang: config2?.lang ?? store?.lang,
    message: config2?.message,
    abortEarly: config2?.abortEarly ?? store?.abortEarly,
    abortPipeEarly: config2?.abortPipeEarly ?? store?.abortPipeEarly
  };
}
var store2;
function getGlobalMessage(lang) {
  return store2?.get(lang);
}
var store3;
function getSchemaMessage(lang) {
  return store3?.get(lang);
}
var store4;
function getSpecificMessage(reference, lang) {
  return store4?.get(reference)?.get(lang);
}
function _stringify(input) {
  const type = typeof input;
  if (type === "string") {
    return `"${input}"`;
  }
  if (type === "number" || type === "bigint" || type === "boolean") {
    return `${input}`;
  }
  if (type === "object" || type === "function") {
    return (input && Object.getPrototypeOf(input)?.constructor?.name) ?? "null";
  }
  return type;
}
function _addIssue(context, label, dataset, config2, other) {
  const input = other && "input" in other ? other.input : dataset.value;
  const expected = other?.expected ?? context.expects ?? null;
  const received = other?.received ?? _stringify(input);
  const issue = {
    kind: context.kind,
    type: context.type,
    input,
    expected,
    received,
    message: `Invalid ${label}: ${expected ? `Expected ${expected} but r` : "R"}eceived ${received}`,
    requirement: context.requirement,
    path: other?.path,
    issues: other?.issues,
    lang: config2.lang,
    abortEarly: config2.abortEarly,
    abortPipeEarly: config2.abortPipeEarly
  };
  const isSchema = context.kind === "schema";
  const message = other?.message ?? context.message ?? getSpecificMessage(context.reference, issue.lang) ?? (isSchema ? getSchemaMessage(issue.lang) : null) ?? config2.message ?? getGlobalMessage(issue.lang);
  if (message) {
    issue.message = typeof message === "function" ? message(issue) : message;
  }
  if (isSchema) {
    dataset.typed = false;
  }
  if (dataset.issues) {
    dataset.issues.push(issue);
  } else {
    dataset.issues = [issue];
  }
}
function _getStandardProps(context) {
  return {
    version: 1,
    vendor: "valibot",
    validate(value2) {
      return context["~run"]({ value: value2 }, getGlobalConfig());
    }
  };
}
function _isValidObjectKey(object2, key) {
  return Object.hasOwn(object2, key) && key !== "__proto__" && key !== "prototype" && key !== "constructor";
}
function _joinExpects(values, separator) {
  const list = [...new Set(values)];
  if (list.length > 1) {
    return `(${list.join(` ${separator} `)})`;
  }
  return list[0] ?? "never";
}
var HEX_COLOR_REGEX = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/iu;
function hexColor(message) {
  return {
    kind: "validation",
    type: "hex_color",
    reference: hexColor,
    async: false,
    expects: null,
    requirement: HEX_COLOR_REGEX,
    message,
    "~run"(dataset, config2) {
      if (dataset.typed && !this.requirement.test(dataset.value)) {
        _addIssue(this, "hex color", dataset, config2);
      }
      return dataset;
    }
  };
}
function maxValue(requirement, message) {
  return {
    kind: "validation",
    type: "max_value",
    reference: maxValue,
    async: false,
    expects: `<=${requirement instanceof Date ? requirement.toJSON() : _stringify(requirement)}`,
    requirement,
    message,
    "~run"(dataset, config2) {
      if (dataset.typed && !(dataset.value <= this.requirement)) {
        _addIssue(this, "value", dataset, config2, {
          received: dataset.value instanceof Date ? dataset.value.toJSON() : _stringify(dataset.value)
        });
      }
      return dataset;
    }
  };
}
function minValue(requirement, message) {
  return {
    kind: "validation",
    type: "min_value",
    reference: minValue,
    async: false,
    expects: `>=${requirement instanceof Date ? requirement.toJSON() : _stringify(requirement)}`,
    requirement,
    message,
    "~run"(dataset, config2) {
      if (dataset.typed && !(dataset.value >= this.requirement)) {
        _addIssue(this, "value", dataset, config2, {
          received: dataset.value instanceof Date ? dataset.value.toJSON() : _stringify(dataset.value)
        });
      }
      return dataset;
    }
  };
}
function getDefault(schema, dataset, config2) {
  return typeof schema.default === "function" ? schema.default(dataset, config2) : schema.default;
}
function any() {
  return {
    kind: "schema",
    type: "any",
    reference: any,
    expects: "any",
    async: false,
    get "~standard"() {
      return _getStandardProps(this);
    },
    "~run"(dataset) {
      dataset.typed = true;
      return dataset;
    }
  };
}
function array(item, message) {
  return {
    kind: "schema",
    type: "array",
    reference: array,
    expects: "Array",
    async: false,
    item,
    message,
    get "~standard"() {
      return _getStandardProps(this);
    },
    "~run"(dataset, config2) {
      const input = dataset.value;
      if (Array.isArray(input)) {
        dataset.typed = true;
        dataset.value = [];
        for (let key = 0;key < input.length; key++) {
          const value2 = input[key];
          const itemDataset = this.item["~run"]({ value: value2 }, config2);
          if (itemDataset.issues) {
            const pathItem = {
              type: "array",
              origin: "value",
              input,
              key,
              value: value2
            };
            for (const issue of itemDataset.issues) {
              if (issue.path) {
                issue.path.unshift(pathItem);
              } else {
                issue.path = [pathItem];
              }
              dataset.issues?.push(issue);
            }
            if (!dataset.issues) {
              dataset.issues = itemDataset.issues;
            }
            if (config2.abortEarly) {
              dataset.typed = false;
              break;
            }
          }
          if (!itemDataset.typed) {
            dataset.typed = false;
          }
          dataset.value.push(itemDataset.value);
        }
      } else {
        _addIssue(this, "type", dataset, config2);
      }
      return dataset;
    }
  };
}
function boolean(message) {
  return {
    kind: "schema",
    type: "boolean",
    reference: boolean,
    expects: "boolean",
    async: false,
    message,
    get "~standard"() {
      return _getStandardProps(this);
    },
    "~run"(dataset, config2) {
      if (typeof dataset.value === "boolean") {
        dataset.typed = true;
      } else {
        _addIssue(this, "type", dataset, config2);
      }
      return dataset;
    }
  };
}
function date(message) {
  return {
    kind: "schema",
    type: "date",
    reference: date,
    expects: "Date",
    async: false,
    message,
    get "~standard"() {
      return _getStandardProps(this);
    },
    "~run"(dataset, config2) {
      if (dataset.value instanceof Date) {
        if (!isNaN(dataset.value)) {
          dataset.typed = true;
        } else {
          _addIssue(this, "type", dataset, config2, {
            received: '"Invalid Date"'
          });
        }
      } else {
        _addIssue(this, "type", dataset, config2);
      }
      return dataset;
    }
  };
}
function enum_(enum__, message) {
  const options = [];
  for (const key in enum__) {
    if (`${+key}` !== key || typeof enum__[key] !== "string" || !Object.is(enum__[enum__[key]], +key)) {
      options.push(enum__[key]);
    }
  }
  return {
    kind: "schema",
    type: "enum",
    reference: enum_,
    expects: _joinExpects(options.map(_stringify), "|"),
    async: false,
    enum: enum__,
    options,
    message,
    get "~standard"() {
      return _getStandardProps(this);
    },
    "~run"(dataset, config2) {
      if (this.options.includes(dataset.value)) {
        dataset.typed = true;
      } else {
        _addIssue(this, "type", dataset, config2);
      }
      return dataset;
    }
  };
}
function function_(message) {
  return {
    kind: "schema",
    type: "function",
    reference: function_,
    expects: "Function",
    async: false,
    message,
    get "~standard"() {
      return _getStandardProps(this);
    },
    "~run"(dataset, config2) {
      if (typeof dataset.value === "function") {
        dataset.typed = true;
      } else {
        _addIssue(this, "type", dataset, config2);
      }
      return dataset;
    }
  };
}
function lazy(getter) {
  return {
    kind: "schema",
    type: "lazy",
    reference: lazy,
    expects: "unknown",
    async: false,
    getter,
    get "~standard"() {
      return _getStandardProps(this);
    },
    "~run"(dataset, config2) {
      return this.getter(dataset.value)["~run"](dataset, config2);
    }
  };
}
function literal(literal_, message) {
  return {
    kind: "schema",
    type: "literal",
    reference: literal,
    expects: _stringify(literal_),
    async: false,
    literal: literal_,
    message,
    get "~standard"() {
      return _getStandardProps(this);
    },
    "~run"(dataset, config2) {
      if (dataset.value === this.literal) {
        dataset.typed = true;
      } else {
        _addIssue(this, "type", dataset, config2);
      }
      return dataset;
    }
  };
}
function nullable(wrapped, default_) {
  return {
    kind: "schema",
    type: "nullable",
    reference: nullable,
    expects: `(${wrapped.expects} | null)`,
    async: false,
    wrapped,
    default: default_,
    get "~standard"() {
      return _getStandardProps(this);
    },
    "~run"(dataset, config2) {
      if (dataset.value === null) {
        if (this.default !== undefined) {
          dataset.value = getDefault(this, dataset, config2);
        }
        if (dataset.value === null) {
          dataset.typed = true;
          return dataset;
        }
      }
      return this.wrapped["~run"](dataset, config2);
    }
  };
}
function number(message) {
  return {
    kind: "schema",
    type: "number",
    reference: number,
    expects: "number",
    async: false,
    message,
    get "~standard"() {
      return _getStandardProps(this);
    },
    "~run"(dataset, config2) {
      if (typeof dataset.value === "number" && !isNaN(dataset.value)) {
        dataset.typed = true;
      } else {
        _addIssue(this, "type", dataset, config2);
      }
      return dataset;
    }
  };
}
function object(entries, message) {
  return {
    kind: "schema",
    type: "object",
    reference: object,
    expects: "Object",
    async: false,
    entries,
    message,
    get "~standard"() {
      return _getStandardProps(this);
    },
    "~run"(dataset, config2) {
      const input = dataset.value;
      if (input && typeof input === "object") {
        dataset.typed = true;
        dataset.value = {};
        for (const key in this.entries) {
          const value2 = input[key];
          const valueDataset = this.entries[key]["~run"]({ value: value2 }, config2);
          if (valueDataset.issues) {
            const pathItem = {
              type: "object",
              origin: "value",
              input,
              key,
              value: value2
            };
            for (const issue of valueDataset.issues) {
              if (issue.path) {
                issue.path.unshift(pathItem);
              } else {
                issue.path = [pathItem];
              }
              dataset.issues?.push(issue);
            }
            if (!dataset.issues) {
              dataset.issues = valueDataset.issues;
            }
            if (config2.abortEarly) {
              dataset.typed = false;
              break;
            }
          }
          if (!valueDataset.typed) {
            dataset.typed = false;
          }
          if (valueDataset.value !== undefined || key in input) {
            dataset.value[key] = valueDataset.value;
          }
        }
      } else {
        _addIssue(this, "type", dataset, config2);
      }
      return dataset;
    }
  };
}
function optional(wrapped, default_) {
  return {
    kind: "schema",
    type: "optional",
    reference: optional,
    expects: `(${wrapped.expects} | undefined)`,
    async: false,
    wrapped,
    default: default_,
    get "~standard"() {
      return _getStandardProps(this);
    },
    "~run"(dataset, config2) {
      if (dataset.value === undefined) {
        if (this.default !== undefined) {
          dataset.value = getDefault(this, dataset, config2);
        }
        if (dataset.value === undefined) {
          dataset.typed = true;
          return dataset;
        }
      }
      return this.wrapped["~run"](dataset, config2);
    }
  };
}
function record(key, value2, message) {
  return {
    kind: "schema",
    type: "record",
    reference: record,
    expects: "Object",
    async: false,
    key,
    value: value2,
    message,
    get "~standard"() {
      return _getStandardProps(this);
    },
    "~run"(dataset, config2) {
      const input = dataset.value;
      if (input && typeof input === "object") {
        dataset.typed = true;
        dataset.value = {};
        for (const entryKey in input) {
          if (_isValidObjectKey(input, entryKey)) {
            const entryValue = input[entryKey];
            const keyDataset = this.key["~run"]({ value: entryKey }, config2);
            if (keyDataset.issues) {
              const pathItem = {
                type: "object",
                origin: "key",
                input,
                key: entryKey,
                value: entryValue
              };
              for (const issue of keyDataset.issues) {
                issue.path = [pathItem];
                dataset.issues?.push(issue);
              }
              if (!dataset.issues) {
                dataset.issues = keyDataset.issues;
              }
              if (config2.abortEarly) {
                dataset.typed = false;
                break;
              }
            }
            const valueDataset = this.value["~run"]({ value: entryValue }, config2);
            if (valueDataset.issues) {
              const pathItem = {
                type: "object",
                origin: "value",
                input,
                key: entryKey,
                value: entryValue
              };
              for (const issue of valueDataset.issues) {
                if (issue.path) {
                  issue.path.unshift(pathItem);
                } else {
                  issue.path = [pathItem];
                }
                dataset.issues?.push(issue);
              }
              if (!dataset.issues) {
                dataset.issues = valueDataset.issues;
              }
              if (config2.abortEarly) {
                dataset.typed = false;
                break;
              }
            }
            if (!keyDataset.typed || !valueDataset.typed) {
              dataset.typed = false;
            }
            if (keyDataset.typed) {
              dataset.value[keyDataset.value] = valueDataset.value;
            }
          }
        }
      } else {
        _addIssue(this, "type", dataset, config2);
      }
      return dataset;
    }
  };
}
function string(message) {
  return {
    kind: "schema",
    type: "string",
    reference: string,
    expects: "string",
    async: false,
    message,
    get "~standard"() {
      return _getStandardProps(this);
    },
    "~run"(dataset, config2) {
      if (typeof dataset.value === "string") {
        dataset.typed = true;
      } else {
        _addIssue(this, "type", dataset, config2);
      }
      return dataset;
    }
  };
}
function _subIssues(datasets) {
  let issues;
  if (datasets) {
    for (const dataset of datasets) {
      if (issues) {
        issues.push(...dataset.issues);
      } else {
        issues = dataset.issues;
      }
    }
  }
  return issues;
}
function union(options, message) {
  return {
    kind: "schema",
    type: "union",
    reference: union,
    expects: _joinExpects(options.map((option) => option.expects), "|"),
    async: false,
    options,
    message,
    get "~standard"() {
      return _getStandardProps(this);
    },
    "~run"(dataset, config2) {
      let validDataset;
      let typedDatasets;
      let untypedDatasets;
      for (const schema of this.options) {
        const optionDataset = schema["~run"]({ value: dataset.value }, config2);
        if (optionDataset.typed) {
          if (optionDataset.issues) {
            if (typedDatasets) {
              typedDatasets.push(optionDataset);
            } else {
              typedDatasets = [optionDataset];
            }
          } else {
            validDataset = optionDataset;
            break;
          }
        } else {
          if (untypedDatasets) {
            untypedDatasets.push(optionDataset);
          } else {
            untypedDatasets = [optionDataset];
          }
        }
      }
      if (validDataset) {
        return validDataset;
      }
      if (typedDatasets) {
        if (typedDatasets.length === 1) {
          return typedDatasets[0];
        }
        _addIssue(this, "type", dataset, config2, {
          issues: _subIssues(typedDatasets)
        });
        dataset.typed = true;
      } else if (untypedDatasets?.length === 1) {
        return untypedDatasets[0];
      } else {
        _addIssue(this, "type", dataset, config2, {
          issues: _subIssues(untypedDatasets)
        });
      }
      return dataset;
    }
  };
}
function pipe(...pipe2) {
  return {
    ...pipe2[0],
    pipe: pipe2,
    get "~standard"() {
      return _getStandardProps(this);
    },
    "~run"(dataset, config2) {
      for (const item of pipe2) {
        if (item.kind !== "metadata") {
          if (dataset.issues && (item.kind === "schema" || item.kind === "transformation")) {
            dataset.typed = false;
            break;
          }
          if (!dataset.issues || !config2.abortEarly && !config2.abortPipeEarly) {
            dataset = item["~run"](dataset, config2);
          }
        }
      }
      return dataset;
    }
  };
}

// node_modules/.pnpm/@kksh+api@0.0.48_svelte@5.1.16_typescript@5.6.3/node_modules/@kksh/api/src/models/constants.ts
var NodeNameEnum;
((NodeNameEnum2) => {
  NodeNameEnum2["List"] = "List";
  NodeNameEnum2["ListItem"] = "ListItem";
  NodeNameEnum2["ListItemDetail"] = "ListItemDetail";
  NodeNameEnum2["ListItemAccessory"] = "ListItemAccessory";
  NodeNameEnum2["ListSection"] = "ListSection";
  NodeNameEnum2["ListItemDetailMetadata"] = "ListItemDetailMetadata";
  NodeNameEnum2["ListItemDetailMetadataLabel"] = "ListItemDetailMetadataLabel";
  NodeNameEnum2["ListItemDetailMetadataLink"] = "ListItemDetailMetadataLink";
  NodeNameEnum2["ListItemDetailMetadataTagList"] = "ListItemDetailMetadataTagList";
  NodeNameEnum2["ListItemDetailMetadataTagListItem"] = "ListItemDetailMetadataTagListItem";
  NodeNameEnum2["ListItemDetailMetadataSeparator"] = "ListItemDetailMetadataSeparator";
  NodeNameEnum2["Icon"] = "Icon";
  NodeNameEnum2["EmptyView"] = "EmptyView";
  NodeNameEnum2["Dropdown"] = "Dropdown";
  NodeNameEnum2["DropdownSection"] = "DropdownSection";
  NodeNameEnum2["DropdownItem"] = "DropdownItem";
  NodeNameEnum2["ActionPanel"] = "ActionPanel";
  NodeNameEnum2["Action"] = "Action";
  NodeNameEnum2["ActionPanelSection"] = "ActionPanelSection";
  NodeNameEnum2["ActionPanelSubmenu"] = "ActionPanelSubmenu";
  NodeNameEnum2["Markdown"] = "Markdown";
})(NodeNameEnum ||= {});
var NodeName = enum_(NodeNameEnum);
var FormNodeNameEnum;
((FormNodeNameEnum2) => {
  FormNodeNameEnum2["Base"] = "Base";
  FormNodeNameEnum2["Number"] = "Number";
  FormNodeNameEnum2["Select"] = "Select";
  FormNodeNameEnum2["Boolean"] = "Boolean";
  FormNodeNameEnum2["Input"] = "Input";
  FormNodeNameEnum2["Date"] = "Date";
  FormNodeNameEnum2["Array"] = "Array";
  FormNodeNameEnum2["Form"] = "Form";
})(FormNodeNameEnum ||= {});
var FormNodeName = enum_(FormNodeNameEnum);

// node_modules/.pnpm/@kksh+api@0.0.48_svelte@5.1.16_typescript@5.6.3/node_modules/@kksh/api/src/models/icon.ts
var IconEnum;
((IconEnum2) => {
  IconEnum2["Iconify"] = "iconify";
  IconEnum2["RemoteUrl"] = "remote-url";
  IconEnum2["Svg"] = "svg";
  IconEnum2["Base64PNG"] = "base64-png";
  IconEnum2["Text"] = "text";
})(IconEnum ||= {});
var IconType = enum_(IconEnum);
var BaseIcon = object({
  type: IconType,
  value: string(),
  invert: optional(boolean()),
  darkInvert: optional(boolean()),
  hexColor: optional(string()),
  bgColor: optional(string())
});
var Icon = object({
  ...BaseIcon.entries,
  fallback: optional(lazy(() => Icon))
});
var IconNode = object({
  ...BaseIcon.entries,
  nodeName: NodeName,
  fallback: optional(lazy(() => Icon))
});

// node_modules/.pnpm/@kksh+api@0.0.48_svelte@5.1.16_typescript@5.6.3/node_modules/@kksh/api/src/models/styles.ts
var Color = pipe(string(), hexColor());
var CustomPosition = object({
  top: optional(number()),
  right: optional(number()),
  bottom: optional(number()),
  left: optional(number())
});
var LightMode = union([literal("light"), literal("dark"), literal("auto")]);
var ThemeColor = union([
  literal("zinc"),
  literal("slate"),
  literal("stone"),
  literal("gray"),
  literal("neutral"),
  literal("red"),
  literal("rose"),
  literal("orange"),
  literal("green"),
  literal("blue"),
  literal("yellow"),
  literal("violet")
]);
var Radius = pipe(number(), minValue(0), maxValue(1));

// node_modules/.pnpm/@kksh+api@0.0.48_svelte@5.1.16_typescript@5.6.3/node_modules/@kksh/api/src/ui/worker/schema/action.ts
var Action = object({
  nodeName: NodeName,
  icon: optional(Icon),
  title: string(),
  value: string()
});
var ActionPanel = object({
  nodeName: NodeName,
  title: optional(string()),
  items: array(union([
    Action
  ]))
});

// node_modules/.pnpm/@kksh+api@0.0.48_svelte@5.1.16_typescript@5.6.3/node_modules/@kksh/api/src/ui/worker/schema/markdown.ts
var Markdown = object({
  nodeName: NodeName,
  content: string()
});

// node_modules/.pnpm/@kksh+api@0.0.48_svelte@5.1.16_typescript@5.6.3/node_modules/@kksh/api/src/ui/worker/schema/list.ts
var EmptyView = object({
  nodeName: NodeName,
  title: optional(string()),
  description: optional(string()),
  icon: optional(Icon)
});
var DropdownItem = object({
  nodeName: NodeName,
  title: string(),
  value: string(),
  icon: optional(Icon),
  keywords: optional(array(string()))
});
var DropdownSection = object({
  nodeName: NodeName,
  title: string(),
  items: array(DropdownItem)
});
var Dropdown = object({
  nodeName: NodeName,
  tooltip: string(),
  sections: array(DropdownSection),
  defaultValue: string()
});
var ItemAccessory = object({
  nodeName: NodeName,
  tag: optional(union([
    string(),
    object({
      color: Color,
      text: string()
    })
  ])),
  text: optional(union([string(), object({ color: Color, text: string() })])),
  date: optional(union([date(), object({ color: Color, text: date() })])),
  icon: optional(Icon),
  tooltip: optional(string())
});
var ItemDetailMetadataLabel = object({
  nodeName: literal("ListItemDetailMetadataLabel" /* ListItemDetailMetadataLabel */),
  title: string(),
  icon: optional(Icon),
  text: optional(union([
    string(),
    object({
      color: Color,
      text: string()
    })
  ]))
});
var ItemDetailMetadataLink = object({
  nodeName: literal("ListItemDetailMetadataLink" /* ListItemDetailMetadataLink */),
  title: string(),
  text: string(),
  url: string()
});
var ItemDetailMetadataTagListItem = object({
  nodeName: literal("ListItemDetailMetadataTagListItem" /* ListItemDetailMetadataTagListItem */),
  text: optional(string()),
  color: optional(Color)
});
var ItemDetailMetadataTagList = object({
  nodeName: literal("ListItemDetailMetadataTagList" /* ListItemDetailMetadataTagList */),
  title: string(),
  tags: array(ItemDetailMetadataTagListItem)
});
var ItemDetailMetadataSeparator = object({
  nodeName: literal("ListItemDetailMetadataSeparator" /* ListItemDetailMetadataSeparator */)
});
var ItemDetailMetadataItem = union([
  ItemDetailMetadataLabel,
  ItemDetailMetadataLink,
  ItemDetailMetadataTagList,
  ItemDetailMetadataSeparator
]);
var ItemDetailMetadata = object({
  nodeName: literal("ListItemDetailMetadata" /* ListItemDetailMetadata */),
  items: array(ItemDetailMetadataItem)
});
var ItemDetail = object({
  nodeName: literal("ListItemDetail" /* ListItemDetail */),
  children: array(union([Markdown, ItemDetailMetadata])),
  width: optional(number())
});
var Item = object({
  nodeName: literal("ListItem" /* ListItem */),
  title: string(),
  subTitle: optional(string()),
  accessories: optional(array(ItemAccessory)),
  value: string(),
  defaultAction: optional(string()),
  actions: optional(ActionPanel),
  icon: optional(Icon),
  keywords: optional(array(string()))
});
var Section = object({
  nodeName: literal("ListSection" /* ListSection */),
  title: optional(string()),
  subtitle: optional(string()),
  items: array(Item)
});
var ListInheritOptions = union([
  literal("items"),
  literal("detail"),
  literal("filter"),
  literal("sections"),
  literal("actions"),
  literal("defaultAction")
]);
var List = object({
  nodeName: literal("List" /* List */),
  sections: optional(array(Section)),
  items: optional(array(Item)),
  filter: union([literal("none"), literal("default")]),
  detail: optional(ItemDetail),
  actions: optional(ActionPanel),
  defaultAction: optional(string()),
  inherits: optional(array(ListInheritOptions))
});
// node_modules/.pnpm/@kksh+api@0.0.48_svelte@5.1.16_typescript@5.6.3/node_modules/@kksh/api/src/ui/worker/schema/form.ts
var InputTypes = union([
  literal("color"),
  literal("date"),
  literal("datetime-local"),
  literal("month"),
  literal("number"),
  literal("password"),
  literal("text"),
  literal("url"),
  literal("week"),
  literal("time"),
  literal("search")
]);
var BaseField = object({
  nodeName: FormNodeName,
  key: string(),
  label: optional(string()),
  hideLabel: optional(boolean()),
  placeholder: optional(string()),
  optional: optional(boolean()),
  description: optional(string()),
  default: optional(any())
});
var InputField = object({
  ...BaseField.entries,
  type: optional(InputTypes),
  component: optional(union([literal("textarea"), literal("default")])),
  default: optional(string())
});
var NumberField = object({
  ...BaseField.entries,
  nodeName: FormNodeName,
  default: optional(number())
});
var SelectField = object({
  ...BaseField.entries,
  options: array(string()),
  default: optional(string())
});
var BooleanField = object({
  ...BaseField.entries,
  component: optional(union([literal("checkbox"), literal("switch")]))
});
var DateField = object({
  ...BaseField.entries,
  default: optional(string())
});
var AllFormFields = union([InputField, NumberField, SelectField, BooleanField, DateField]);
var ArrayField = object({
  ...BaseField.entries,
  content: AllFormFields
});
var FormField = union([
  ArrayField,
  SelectField,
  InputField,
  NumberField,
  BooleanField,
  DateField
]);
var Form = object({
  nodeName: FormNodeName,
  key: string(),
  fields: array(union([lazy(() => Form), FormField])),
  title: optional(string()),
  description: optional(string()),
  submitBtnText: optional(string())
});
// node_modules/.pnpm/@kksh+api@0.0.48_svelte@5.1.16_typescript@5.6.3/node_modules/@kksh/api/src/ui/worker/components/icon.ts
class Icon2 {
  nodeName = "Icon" /* Icon */;
  type;
  value;
  invert;
  darkInvert;
  hexColor;
  bgColor;
  constructor(model) {
    this.type = model.type;
    this.value = model.value;
    this.invert = model.invert;
    this.darkInvert = model.darkInvert;
    this.hexColor = model.hexColor;
    this.bgColor = model.bgColor;
  }
  toModel() {
    return {
      nodeName: this.nodeName,
      type: this.type,
      value: this.value,
      invert: this.invert,
      darkInvert: this.darkInvert,
      hexColor: this.hexColor,
      bgColor: this.bgColor
    };
  }
}
// node_modules/.pnpm/@kksh+api@0.0.48_svelte@5.1.16_typescript@5.6.3/node_modules/@kksh/api/src/ui/worker/components/list-view.ts
var exports_list_view = {};
__export(exports_list_view, {
  Section: () => Section2,
  List: () => List2,
  ItemDetailMetadataTagListItem: () => ItemDetailMetadataTagListItem2,
  ItemDetailMetadataTagList: () => ItemDetailMetadataTagList2,
  ItemDetailMetadataSeparator: () => ItemDetailMetadataSeparator2,
  ItemDetailMetadataLink: () => ItemDetailMetadataLink2,
  ItemDetailMetadataLabel: () => ItemDetailMetadataLabel2,
  ItemDetailMetadata: () => ItemDetailMetadata2,
  ItemDetail: () => ItemDetail2,
  ItemAccessory: () => ItemAccessory2,
  Item: () => Item2,
  EmptyView: () => EmptyView2,
  DropdownSection: () => DropdownSection2,
  DropdownItem: () => DropdownItem2,
  Dropdown: () => Dropdown2
});
class EmptyView2 {
  nodeName = "EmptyView" /* EmptyView */;
  title;
  description;
  icon;
  constructor(model) {
    this.title = model.title;
    this.description = model.description;
    this.icon = model.icon;
  }
  toModel() {
    return {
      nodeName: this.nodeName,
      title: this.title,
      description: this.description,
      icon: this.icon?.toModel()
    };
  }
}

class DropdownItem2 {
  nodeName = "DropdownItem" /* DropdownItem */;
  title;
  value;
  icon;
  keywords;
  constructor(model) {
    this.title = model.title;
    this.value = model.value;
    this.icon = model.icon;
    this.keywords = model.keywords;
  }
  toModel() {
    return {
      nodeName: this.nodeName,
      title: this.title,
      value: this.value,
      icon: this.icon?.toModel(),
      keywords: this.keywords
    };
  }
}

class DropdownSection2 {
  nodeName = "DropdownSection" /* DropdownSection */;
  title;
  items;
  constructor(model) {
    this.title = model.title;
    this.items = model.items;
  }
  toModel() {
    return {
      nodeName: this.nodeName,
      title: this.title,
      items: this.items.map((item) => item.toModel())
    };
  }
}

class Dropdown2 {
  nodeName = "Dropdown" /* Dropdown */;
  tooltip;
  sections;
  defaultValue;
  constructor(model) {
    this.tooltip = model.tooltip;
    this.sections = model.sections;
    this.defaultValue = model.defaultValue;
  }
  toModel() {
    return {
      nodeName: this.nodeName,
      tooltip: this.tooltip,
      sections: this.sections.map((section) => section.toModel()),
      defaultValue: this.defaultValue
    };
  }
}

class ItemAccessory2 {
  nodeName = "ListItemAccessory" /* ListItemAccessory */;
  tag;
  text;
  date;
  icon;
  tooltip;
  constructor(model) {
    this.tag = model.tag;
    this.text = model.text;
    this.date = model.date;
    this.icon = model.icon;
    this.tooltip = model.tooltip;
  }
  toModel() {
    return {
      nodeName: this.nodeName,
      tag: this.tag,
      text: this.text,
      date: this.date,
      icon: this.icon?.toModel(),
      tooltip: this.tooltip
    };
  }
}

class ItemDetailMetadataLabel2 {
  nodeName = "ListItemDetailMetadataLabel" /* ListItemDetailMetadataLabel */;
  title;
  icon;
  text;
  constructor(model) {
    this.title = model.title;
    this.icon = model.icon;
    this.text = model.text;
  }
  toModel() {
    return {
      nodeName: this.nodeName,
      title: this.title,
      icon: this.icon?.toModel(),
      text: this.text
    };
  }
}

class ItemDetailMetadataLink2 {
  nodeName = "ListItemDetailMetadataLink" /* ListItemDetailMetadataLink */;
  title;
  text;
  url;
  constructor(model) {
    this.title = model.title;
    this.text = model.text;
    this.url = model.url;
  }
  toModel() {
    return {
      nodeName: this.nodeName,
      title: this.title,
      text: this.text,
      url: this.url
    };
  }
}

class ItemDetailMetadataTagListItem2 {
  nodeName = "ListItemDetailMetadataTagListItem" /* ListItemDetailMetadataTagListItem */;
  text;
  color;
  icon;
  constructor(model) {
    this.text = model.text;
    this.color = model.color;
    this.icon = model.icon;
  }
  toModel() {
    return {
      nodeName: this.nodeName,
      text: this.text,
      color: this.color
    };
  }
}

class ItemDetailMetadataTagList2 {
  nodeName = "ListItemDetailMetadataTagList" /* ListItemDetailMetadataTagList */;
  title;
  tags;
  constructor(model) {
    this.title = model.title;
    this.tags = model.tags;
  }
  toModel() {
    return {
      nodeName: this.nodeName,
      title: this.title,
      tags: this.tags.map((tag) => tag.toModel())
    };
  }
}

class ItemDetailMetadataSeparator2 {
  nodeName = "ListItemDetailMetadataSeparator" /* ListItemDetailMetadataSeparator */;
  toModel() {
    return {
      nodeName: this.nodeName
    };
  }
}

class ItemDetailMetadata2 {
  nodeName = "ListItemDetailMetadata" /* ListItemDetailMetadata */;
  items;
  constructor(items) {
    this.items = items;
  }
  toModel() {
    return {
      nodeName: this.nodeName,
      items: this.items.map((item) => item.toModel())
    };
  }
}

class ItemDetail2 {
  nodeName = "ListItemDetail" /* ListItemDetail */;
  children;
  width;
  constructor(model) {
    this.children = model.children;
    this.width = model.width;
  }
  toModel() {
    return {
      nodeName: this.nodeName,
      children: this.children.map((child) => child.toModel()),
      width: this.width
    };
  }
}

class Item2 {
  nodeName = "ListItem" /* ListItem */;
  title;
  value;
  subTitle;
  accessories;
  icon;
  keywords;
  defaultAction;
  actions;
  constructor(model) {
    this.title = model.title;
    this.value = model.value;
    this.actions = model.actions;
    this.defaultAction = model.defaultAction;
    this.subTitle = model.subTitle;
    this.accessories = model.accessories;
    this.icon = model.icon;
    this.keywords = model.keywords;
  }
  toModel() {
    return {
      nodeName: this.nodeName,
      title: this.title,
      value: this.value,
      defaultAction: this.defaultAction,
      actions: this.actions?.toModel(),
      subTitle: this.subTitle,
      accessories: this.accessories?.map((accessory) => accessory.toModel()),
      icon: this.icon?.toModel(),
      keywords: this.keywords
    };
  }
}

class Section2 {
  nodeName = "ListSection" /* ListSection */;
  title;
  items;
  constructor(model) {
    this.title = model.title;
    this.items = model.items;
  }
  toModel() {
    return {
      nodeName: this.nodeName,
      title: this.title,
      items: this.items.map((item) => item.toModel())
    };
  }
}

class List2 {
  nodeName = "List" /* List */;
  sections;
  items;
  detail;
  filter;
  inherits;
  actions;
  defaultAction;
  constructor(model) {
    this.sections = model.sections;
    this.items = model.items;
    this.detail = model.detail;
    this.filter = model.filter ?? "default";
    this.inherits = model.inherits ?? [];
    this.actions = model.actions;
    this.defaultAction = model.defaultAction;
  }
  toModel() {
    return {
      nodeName: this.nodeName,
      sections: this.sections?.map((section) => section.toModel()),
      items: this.items?.map((item) => item.toModel()),
      filter: this.filter,
      detail: this.detail?.toModel(),
      inherits: this.inherits,
      actions: this.actions?.toModel(),
      defaultAction: this.defaultAction
    };
  }
}
// node_modules/.pnpm/@kksh+api@0.0.48_svelte@5.1.16_typescript@5.6.3/node_modules/@kksh/api/src/ui/worker/components/action.ts
class Action2 {
  nodeName = "Action" /* Action */;
  icon;
  title;
  value;
  constructor(model) {
    this.icon = model.icon;
    this.title = model.title;
    this.value = model.value;
  }
  toModel() {
    return {
      nodeName: this.nodeName,
      title: this.title,
      value: this.value,
      icon: this.icon
    };
  }
}

class ActionPanel2 {
  nodeName = "ActionPanel" /* ActionPanel */;
  title;
  items;
  constructor(model) {
    this.title = model.title;
    this.items = model.items;
  }
  toModel() {
    return {
      nodeName: this.nodeName,
      title: this.title,
      items: this.items.map((item) => item.toModel())
    };
  }
}
// node_modules/.pnpm/@kksh+api@0.0.48_svelte@5.1.16_typescript@5.6.3/node_modules/@kksh/api/src/models/apps.ts
var AppInfo = object({
  name: string(),
  icon_path: nullable(string()),
  app_path_exe: nullable(string()),
  app_desktop_path: string()
});
// node_modules/.pnpm/@kksh+api@0.0.48_svelte@5.1.16_typescript@5.6.3/node_modules/@kksh/api/src/models/extension.ts
var ExtensionLabelMap = record(string("Window label"), object({
  path: string("Path to the extension"),
  processes: array(number()),
  dist: optional(nullable(string()))
}));
var Ext = object({
  extId: number(),
  identifier: string(),
  version: string(),
  enabled: boolean(),
  installed_at: string(),
  path: nullable(string()),
  data: nullable(any())
});
var CmdTypeEnum;
((CmdTypeEnum2) => {
  CmdTypeEnum2["HeadlessWorker"] = "headless_worker";
  CmdTypeEnum2["Builtin"] = "builtin";
  CmdTypeEnum2["System"] = "system";
  CmdTypeEnum2["UiWorker"] = "ui_worker";
  CmdTypeEnum2["UiIframe"] = "ui_iframe";
  CmdTypeEnum2["QuickLink"] = "quick_link";
  CmdTypeEnum2["Remote"] = "remote";
})(CmdTypeEnum ||= {});
var CmdType = enum_(CmdTypeEnum);
var ExtCmd = object({
  cmdId: number(),
  extId: number(),
  name: string(),
  type: CmdType,
  data: string(),
  alias: nullable(optional(string())),
  hotkey: nullable(optional(string())),
  enabled: boolean()
});
var QuickLinkCmd = object({
  ...ExtCmd.entries,
  data: object({ link: string(), icon: Icon })
});
var ExtData = object({
  dataId: number(),
  extId: number(),
  dataType: string(),
  data: optional(string()),
  searchText: optional(string()),
  createdAt: date(),
  updatedAt: date()
});
var SysCommand = object({
  name: string(),
  value: string(),
  icon: nullable(Icon),
  keywords: nullable(array(string())),
  function: function_(),
  confirmRequired: boolean()
});
// node_modules/.pnpm/@kksh+api@0.0.48_svelte@5.1.16_typescript@5.6.3/node_modules/@kksh/api/src/models/sql.ts
var SQLSortOrderEnum;
((SQLSortOrderEnum2) => {
  SQLSortOrderEnum2["Asc"] = "ASC";
  SQLSortOrderEnum2["Desc"] = "DESC";
})(SQLSortOrderEnum ||= {});
var SQLSortOrder = enum_(SQLSortOrderEnum);
var SearchModeEnum;
((SearchModeEnum2) => {
  SearchModeEnum2["ExactMatch"] = "exact_match";
  SearchModeEnum2["Like"] = "like";
  SearchModeEnum2["FTS"] = "fts";
})(SearchModeEnum ||= {});
var SearchMode = enum_(SearchModeEnum);
// node_modules/.pnpm/tauri-api-adapter@0.3.16_typescript@5.6.3/node_modules/tauri-api-adapter/dist/permissions/schema.js
var ClipboardPermissionSchema = union([
  literal("clipboard:read-all"),
  literal("clipboard:write-all"),
  literal("clipboard:read-text"),
  literal("clipboard:write-text"),
  literal("clipboard:read-image"),
  literal("clipboard:write-image"),
  literal("clipboard:read-files"),
  literal("clipboard:write-files")
]);
var DialogPermissionSchema = union([literal("dialog:all")]);
var NotificationPermissionSchema = union([literal("notification:all")]);
var FsPermissionSchema = union([literal("fs:read"), literal("fs:write"), literal("fs:exists")]);
var OsPermissionSchema = literal("os:all");
var ShellPermissionSchema = union([literal("shell:open"), literal("shell:execute")]);
var FetchPermissionSchema = literal("fetch:all");
var SystemInfoPermissionSchema = union([
  literal("system-info:all"),
  literal("system-info:memory"),
  literal("system-info:cpu"),
  literal("system-info:os"),
  literal("system-info:disk"),
  literal("system-info:network"),
  literal("system-info:battery"),
  literal("system-info:process"),
  literal("system-info:components")
]);
var NetworkPermissionSchema = union([literal("network:interface"), literal("network:port")]);
var UpdownloadPermissionSchema = union([literal("updownload:download"), literal("updownload:upload")]);
var AllPermissionSchema = union([
  ClipboardPermissionSchema,
  DialogPermissionSchema,
  NotificationPermissionSchema,
  FsPermissionSchema,
  OsPermissionSchema,
  ShellPermissionSchema,
  FetchPermissionSchema,
  SystemInfoPermissionSchema,
  NetworkPermissionSchema,
  UpdownloadPermissionSchema
]);
// node_modules/.pnpm/@kksh+api@0.0.48_svelte@5.1.16_typescript@5.6.3/node_modules/@kksh/api/src/permissions/schema.ts
var SystemPermissionSchema = union([
  literal("system:volumn"),
  literal("system:boot"),
  literal("system:disk"),
  literal("system:apps"),
  literal("system:fs"),
  literal("system:ui")
]);
var KunkunFsPermissionSchema = union([
  FsPermissionSchema,
  literal("fs:read-dir"),
  literal("fs:stat"),
  literal("fs:search")
]);
var EventPermissionSchema = union([
  literal("event:drag-drop"),
  literal("event:drag-enter"),
  literal("event:drag-leave"),
  literal("event:drag-over"),
  literal("event:window-blur"),
  literal("event:window-close-requested"),
  literal("event:window-focus")
]);
var SecurityPermissionSchema = union([
  literal("security:mac:reveal-security-pane"),
  literal("security:mac:verify-fingerprint"),
  literal("security:mac:reset-screencapture-permission"),
  literal("security:mac:request-permission"),
  literal("security:mac:check-permission"),
  literal("security:mac:all")
]);
var DenoSysOptions = union([
  literal("hostname"),
  literal("osRelease"),
  literal("osUptime"),
  literal("loadavg"),
  literal("networkInterfaces"),
  literal("systemMemoryInfo"),
  literal("uid"),
  literal("gid"),
  literal("cpus"),
  string()
]);
var DenoPermissionScopeSchema = object({
  net: optional(union([literal("*"), array(string())])),
  env: optional(union([literal("*"), array(string())])),
  read: optional(union([literal("*"), array(string())])),
  write: optional(union([literal("*"), array(string())])),
  run: optional(union([literal("*"), array(string())])),
  ffi: optional(union([literal("*"), array(string())])),
  sys: optional(union([literal("*"), array(DenoSysOptions)]))
});
var PermissionScopeSchema = object({
  path: optional(string()),
  url: optional(string()),
  cmd: optional(object({
    program: string(),
    args: array(string())
  })),
  ...DenoPermissionScopeSchema.entries
});
var FsPermissionScopedSchema = object({
  permission: KunkunFsPermissionSchema,
  allow: optional(array(PermissionScopeSchema)),
  deny: optional(array(PermissionScopeSchema))
});
var OpenPermissionSchema = union([
  literal("open:url"),
  literal("open:file"),
  literal("open:folder")
]);
var OpenPermissionScopedSchema = object({
  permission: OpenPermissionSchema,
  allow: optional(array(PermissionScopeSchema)),
  deny: optional(array(PermissionScopeSchema))
});
var ShellPermissionSchema2 = union([
  literal("shell:execute"),
  literal("shell:deno:execute"),
  literal("shell:spawn"),
  literal("shell:deno:spawn"),
  literal("shell:open"),
  literal("shell:kill"),
  literal("shell:all"),
  literal("shell:stdin-write")
]);
var ShellPermissionScopedSchema = object({
  permission: ShellPermissionSchema2,
  allow: optional(array(PermissionScopeSchema)),
  deny: optional(array(PermissionScopeSchema))
});
var KunkunManifestPermission = union([
  ClipboardPermissionSchema,
  EventPermissionSchema,
  DialogPermissionSchema,
  NotificationPermissionSchema,
  OsPermissionSchema,
  ShellPermissionSchema2,
  FetchPermissionSchema,
  SystemInfoPermissionSchema,
  NetworkPermissionSchema,
  UpdownloadPermissionSchema,
  SystemPermissionSchema,
  SecurityPermissionSchema
]);
var AllKunkunPermission = union([
  KunkunManifestPermission,
  KunkunFsPermissionSchema,
  OpenPermissionSchema
]);
// node_modules/.pnpm/@kksh+api@0.0.48_svelte@5.1.16_typescript@5.6.3/node_modules/@kksh/api/src/models/manifest.ts
var OSPlatformEnum;
((OSPlatformEnum2) => {
  OSPlatformEnum2["linux"] = "linux";
  OSPlatformEnum2["macos"] = "macos";
  OSPlatformEnum2["windows"] = "windows";
})(OSPlatformEnum ||= {});
var OSPlatform = enum_(OSPlatformEnum);
var allPlatforms = Object.values(OSPlatformEnum);
var TriggerCmd = object({
  type: union([literal("text"), literal("regex")]),
  value: string()
});
var TitleBarStyleEnum;
((TitleBarStyleEnum2) => {
  TitleBarStyleEnum2["visible"] = "visible";
  TitleBarStyleEnum2["transparent"] = "transparent";
  TitleBarStyleEnum2["overlay"] = "overlay";
})(TitleBarStyleEnum ||= {});
var TitleBarStyle = enum_(TitleBarStyleEnum);
var WindowConfig = object({
  center: optional(nullable(boolean())),
  x: optional(nullable(number())),
  y: optional(nullable(number())),
  width: optional(nullable(number())),
  height: optional(nullable(number())),
  minWidth: optional(nullable(number())),
  minHeight: optional(nullable(number())),
  maxWidth: optional(nullable(number())),
  maxHeight: optional(nullable(number())),
  resizable: optional(nullable(boolean())),
  title: optional(nullable(string())),
  fullscreen: optional(nullable(boolean())),
  focus: optional(nullable(boolean())),
  transparent: optional(nullable(boolean())),
  maximized: optional(nullable(boolean())),
  visible: optional(nullable(boolean())),
  decorations: optional(nullable(boolean())),
  alwaysOnTop: optional(nullable(boolean())),
  alwaysOnBottom: optional(nullable(boolean())),
  contentProtected: optional(nullable(boolean())),
  skipTaskbar: optional(nullable(boolean())),
  shadow: optional(nullable(boolean())),
  titleBarStyle: optional(nullable(TitleBarStyle)),
  hiddenTitle: optional(nullable(boolean())),
  tabbingIdentifier: optional(nullable(string())),
  maximizable: optional(nullable(boolean())),
  minimizable: optional(nullable(boolean())),
  closable: optional(nullable(boolean())),
  parent: optional(nullable(string())),
  visibleOnAllWorkspaces: optional(nullable(boolean()))
});
var BaseCmd = object({
  main: string("HTML file to load, e.g. dist/index.html"),
  description: optional(nullable(string("Description of the Command"), ""), ""),
  name: string("Name of the command"),
  cmds: array(TriggerCmd, "Commands to trigger the UI"),
  icon: optional(Icon),
  platforms: optional(nullable(array(OSPlatform, "Platforms available on. Leave empty for all platforms."), allPlatforms), allPlatforms)
});
var CustomUiCmd = object({
  ...BaseCmd.entries,
  type: optional(CmdType, CmdType.enum.UiIframe),
  dist: string("Dist folder to load, e.g. dist, build, out"),
  devMain: string("URL to load in development to support live reload, e.g. http://localhost:5173/"),
  window: optional(nullable(WindowConfig))
});
var TemplateUiCmd = object({
  ...BaseCmd.entries,
  type: optional(CmdType, CmdType.enum.UiWorker),
  window: optional(nullable(WindowConfig))
});
var HeadlessCmd = object({
  ...BaseCmd.entries,
  type: optional(CmdType, CmdType.enum.HeadlessWorker)
});
var PermissionUnion = union([
  KunkunManifestPermission,
  FsPermissionScopedSchema,
  OpenPermissionScopedSchema,
  ShellPermissionScopedSchema
]);
var KunkunExtManifest = object({
  name: string("Name of the extension (Human Readable)"),
  shortDescription: string("Description of the extension (Will be displayed in store)"),
  longDescription: string("Long description of the extension (Will be displayed in store)"),
  identifier: string("Unique identifier for the extension, must be the same as extension folder name"),
  icon: Icon,
  permissions: array(PermissionUnion, "Permissions Declared by the extension. e.g. clipboard-all. Not declared APIs will be blocked."),
  demoImages: array(string("Demo images for the extension")),
  customUiCmds: optional(array(CustomUiCmd, "Custom UI Commands")),
  templateUiCmds: optional(array(TemplateUiCmd, "Template UI Commands")),
  headlessCmds: optional(array(HeadlessCmd, "Headless Commands"))
});
var Person = union([
  object({
    name: string("GitHub Username"),
    email: string("Email of the person"),
    url: optional(nullable(string("URL of the person")))
  }),
  string("GitHub Username")
]);
var ExtPackageJson = object({
  name: string("Package name for the extension (just a regular npm package name)"),
  version: string("Version of the extension"),
  author: optional(Person),
  draft: optional(boolean("Whether the extension is a draft, draft will not be published")),
  contributors: optional(array(Person, "Contributors of the extension")),
  repository: optional(union([
    string("URL of the repository"),
    object({
      type: string("Type of the repository"),
      url: string("URL of the repository"),
      directory: string("Directory of the repository")
    })
  ])),
  kunkun: KunkunExtManifest,
  files: array(string("Files to include in the extension. e.g. ['dist']"))
});
var ExtPackageJsonExtra = object({
  ...ExtPackageJson.entries,
  ...{
    extPath: string(),
    extFolderName: string()
  }
});
// node_modules/.pnpm/@kksh+api@0.0.48_svelte@5.1.16_typescript@5.6.3/node_modules/@kksh/api/src/models/mdns.ts
var MdnsServiceInfo = object({
  addresses: array(string()),
  fullname: string(),
  hostname: string(),
  port: number(),
  service_type: string(),
  subType: optional(string()),
  properties: optional(record(string(), string())),
  publicKey: string(),
  sslCert: string()
});
var MdnsPeers = record(string(), MdnsServiceInfo);
// node_modules/.pnpm/@kksh+api@0.0.48_svelte@5.1.16_typescript@5.6.3/node_modules/@kksh/api/src/models/file-transfer.ts
var FileNode = object({
  filename: string(),
  fileSize: number(),
  id: string(),
  type: number(),
  children: array(lazy(() => FileNode))
});
var FileTransferPayload = object({
  port: string(),
  code: string(),
  totalBytes: number(),
  totalFiles: number(),
  sslCert: string(),
  root: lazy(() => FileNode),
  ip: string()
});
var FilesBucket = object({
  code: string(),
  idPathMap: record(string(), string())
});
// node_modules/.pnpm/@kksh+api@0.0.48_svelte@5.1.16_typescript@5.6.3/node_modules/@kksh/api/src/ui/worker/components/form-view.ts
class BaseField2 {
  nodeName = "Base" /* Base */;
  key;
  label;
  hideLabel;
  placeholder;
  optional;
  description;
  default;
  constructor(model) {
    this.key = model.key;
    this.key = model.key;
    this.label = model.label;
    this.hideLabel = model.hideLabel;
    this.placeholder = model.placeholder;
    this.optional = model.optional;
    this.description = model.description;
    this.default = model.default;
  }
  toModel() {
    return {
      nodeName: this.nodeName,
      key: this.key,
      label: this.label,
      hideLabel: this.hideLabel,
      placeholder: this.placeholder,
      optional: this.optional,
      description: this.description,
      default: this.default
    };
  }
}

class InputField2 extends BaseField2 {
  nodeName = "Input" /* Input */;
  component;
  constructor(model) {
    super(model);
    this.component = model.component;
  }
  toModel() {
    return {
      ...super.toModel(),
      component: this.component
    };
  }
}

class NumberField2 extends BaseField2 {
  nodeName = "Number" /* Number */;
}

class SelectField2 extends BaseField2 {
  nodeName = "Select" /* Select */;
  options;
  constructor(model) {
    super(model);
    this.options = model.options;
  }
  toModel() {
    return {
      ...super.toModel(),
      options: this.options
    };
  }
}

class BooleanField2 extends BaseField2 {
  nodeName = "Boolean" /* Boolean */;
  component;
  constructor(model) {
    super(model);
    this.component = model.component ?? "checkbox";
  }
  toModel() {
    return {
      ...super.toModel(),
      component: this.component
    };
  }
}

class DateField2 extends BaseField2 {
  nodeName = "Date" /* Date */;
}

class ArrayField2 extends BaseField2 {
  nodeName = "Array" /* Array */;
  content;
  constructor(model) {
    super(model);
    this.content = model.content;
  }
  toModel() {
    return {
      ...super.toModel(),
      content: this.content.toModel()
    };
  }
}

class Form2 {
  nodeName = "Form" /* Form */;
  fields;
  key;
  title;
  description;
  submitBtnText;
  constructor(model) {
    this.fields = model.fields;
    this.key = model.key;
    this.title = model.title;
    this.description = model.description;
    this.submitBtnText = model.submitBtnText;
  }
  toModel() {
    return {
      nodeName: this.nodeName,
      key: this.key,
      title: this.title,
      description: this.description,
      submitBtnText: this.submitBtnText,
      fields: this.fields.map((field) => field.toModel())
    };
  }
}
// node_modules/.pnpm/@kksh+api@0.0.48_svelte@5.1.16_typescript@5.6.3/node_modules/@kksh/api/src/ui/worker/components/markdown.ts
class Markdown2 {
  nodeName = "Markdown" /* Markdown */;
  content;
  constructor(content) {
    this.content = content;
  }
  toModel() {
    return {
      nodeName: this.nodeName,
      content: this.content
    };
  }
}
// node_modules/.pnpm/@kksh+api@0.0.48_svelte@5.1.16_typescript@5.6.3/node_modules/@kksh/api/src/ui/worker/index.ts
var io = new WorkerChildIO;
var rpc = new RPCChannel(io, {});
var api = rpc.getAPI();
function expose(api2) {
  rpc.expose(api2);
}
var event = constructEventAPI2(api.event);
var fetch = constructFetchAPI(api.fetch);
var path = constructPathAPI2(api.path);
var shell = constructShellAPI2(api.shell);
var toast = constructToastAPI(api.toast);
var updownload = constructUpdownloadAPI(api.updownload);
var {
  db,
  kv,
  os,
  clipboard,
  dialog,
  fs,
  log,
  notification,
  sysInfo,
  network,
  system,
  open,
  utils,
  app,
  security,
  workerUi: ui
} = api;

// node_modules/.pnpm/filesize@10.1.6/node_modules/filesize/dist/filesize.esm.js
var ARRAY = "array";
var BIT = "bit";
var BITS = "bits";
var BYTE = "byte";
var BYTES = "bytes";
var EMPTY = "";
var EXPONENT = "exponent";
var FUNCTION = "function";
var IEC = "iec";
var INVALID_NUMBER = "Invalid number";
var INVALID_ROUND = "Invalid rounding method";
var JEDEC = "jedec";
var OBJECT = "object";
var PERIOD = ".";
var ROUND = "round";
var S = "s";
var SI = "si";
var SI_KBIT = "kbit";
var SI_KBYTE = "kB";
var SPACE = " ";
var STRING = "string";
var ZERO = "0";
var STRINGS = {
  symbol: {
    iec: {
      bits: ["bit", "Kibit", "Mibit", "Gibit", "Tibit", "Pibit", "Eibit", "Zibit", "Yibit"],
      bytes: ["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"]
    },
    jedec: {
      bits: ["bit", "Kbit", "Mbit", "Gbit", "Tbit", "Pbit", "Ebit", "Zbit", "Ybit"],
      bytes: ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
    }
  },
  fullform: {
    iec: ["", "kibi", "mebi", "gibi", "tebi", "pebi", "exbi", "zebi", "yobi"],
    jedec: ["", "kilo", "mega", "giga", "tera", "peta", "exa", "zetta", "yotta"]
  }
};
function filesize(arg, {
  bits = false,
  pad = false,
  base = -1,
  round = 2,
  locale = EMPTY,
  localeOptions = {},
  separator = EMPTY,
  spacer = SPACE,
  symbols = {},
  standard = EMPTY,
  output = STRING,
  fullform = false,
  fullforms = [],
  exponent = -1,
  roundingMethod = ROUND,
  precision = 0
} = {}) {
  let e = exponent, num = Number(arg), result = [], val = 0, u = EMPTY;
  if (standard === SI) {
    base = 10;
    standard = JEDEC;
  } else if (standard === IEC || standard === JEDEC) {
    base = 2;
  } else if (base === 2) {
    standard = IEC;
  } else {
    base = 10;
    standard = JEDEC;
  }
  const ceil = base === 10 ? 1000 : 1024, full = fullform === true, neg = num < 0, roundingFunc = Math[roundingMethod];
  if (typeof arg !== "bigint" && isNaN(arg)) {
    throw new TypeError(INVALID_NUMBER);
  }
  if (typeof roundingFunc !== FUNCTION) {
    throw new TypeError(INVALID_ROUND);
  }
  if (neg) {
    num = -num;
  }
  if (e === -1 || isNaN(e)) {
    e = Math.floor(Math.log(num) / Math.log(ceil));
    if (e < 0) {
      e = 0;
    }
  }
  if (e > 8) {
    if (precision > 0) {
      precision += 8 - e;
    }
    e = 8;
  }
  if (output === EXPONENT) {
    return e;
  }
  if (num === 0) {
    result[0] = 0;
    u = result[1] = STRINGS.symbol[standard][bits ? BITS : BYTES][e];
  } else {
    val = num / (base === 2 ? Math.pow(2, e * 10) : Math.pow(1000, e));
    if (bits) {
      val = val * 8;
      if (val >= ceil && e < 8) {
        val = val / ceil;
        e++;
      }
    }
    const p = Math.pow(10, e > 0 ? round : 0);
    result[0] = roundingFunc(val * p) / p;
    if (result[0] === ceil && e < 8 && exponent === -1) {
      result[0] = 1;
      e++;
    }
    u = result[1] = base === 10 && e === 1 ? bits ? SI_KBIT : SI_KBYTE : STRINGS.symbol[standard][bits ? BITS : BYTES][e];
  }
  if (neg) {
    result[0] = -result[0];
  }
  if (precision > 0) {
    result[0] = result[0].toPrecision(precision);
  }
  result[1] = symbols[result[1]] || result[1];
  if (locale === true) {
    result[0] = result[0].toLocaleString();
  } else if (locale.length > 0) {
    result[0] = result[0].toLocaleString(locale, localeOptions);
  } else if (separator.length > 0) {
    result[0] = result[0].toString().replace(PERIOD, separator);
  }
  if (pad && round > 0) {
    const i = result[0].toString(), x = separator || ((i.match(/(\D)/g) || []).pop() || PERIOD), tmp = i.toString().split(x), s = tmp[1] || EMPTY, l = s.length, n = round - l;
    result[0] = `${tmp[0]}${x}${s.padEnd(l + n, ZERO)}`;
  }
  if (full) {
    result[1] = fullforms[e] ? fullforms[e] : STRINGS.fullform[standard][e] + (bits ? BIT : BYTE) + (result[0] === 1 ? EMPTY : S);
  }
  return output === ARRAY ? result : output === OBJECT ? {
    value: result[0],
    symbol: result[1],
    exponent: e,
    unit: u
  } : result.join(spacer);
}

// template-ext-src/video-info.ts
class VideoInfo extends WorkerExtension {
  api;
  apiProcess;
  videoMetadata = {};
  async fillApi() {
    if (this.api)
      return;
    const { rpcChannel, process, command } = await shell.createDenoRpcChannel("$EXTENSION/deno-src/index.ts", [], {
      allowAllEnv: true,
      allowAllFfi: true,
      allowAllRead: true,
      allowAllSys: true,
      allowAllRun: true,
      env: {
        FFMPEG_PATH: "/opt/homebrew/bin/ffmpeg",
        FFPROBE_PATH: "/opt/homebrew/bin/ffprobe"
      }
    }, {});
    command.stderr.on("data", (stderr) => {
      console.warn("stderr", stderr);
    });
    this.api = rpcChannel.getAPI();
    this.apiProcess = process;
  }
  async refreshList(paths) {
    ui.render(new exports_list_view.List({ items: [] }));
    if (!this.api)
      await this.fillApi();
    ui.showLoadingBar(true);
    return Promise.all(paths.map((p) => this.api?.readDefaultVideoMetadata(p))).then((metadatas) => metadatas.filter((m) => !!m)).then((metadatas) => {
      this.videoMetadata = Object.fromEntries(paths.map((file, index) => [file, metadatas[index]]));
    }).then(async () => {
      return ui.render(new exports_list_view.List({
        detail: new exports_list_view.ItemDetail({
          width: 60,
          children: []
        }),
        items: await Promise.all(paths.map(async (file) => {
          const baseName = await path.basename(file);
          return new exports_list_view.Item({
            title: baseName,
            value: file
          });
        }))
      }));
    }).finally(() => {
      ui.showLoadingBar(false);
      console.log("finally, kill api process", this.apiProcess?.pid);
      this.apiProcess?.kill();
      this.apiProcess = undefined;
      this.api = undefined;
    });
  }
  async load() {
    ui.render(new exports_list_view.List({ items: [] }));
    await this.fillApi();
    ui.showLoadingBar(true);
    const ffprobePath = await shell.whereIsCommand("ffprobe");
    console.log("ffprobePath", ffprobePath);
    if (!ffprobePath) {
      return toast.error("ffprobe not found in path");
    }
    let videoPaths = (await Promise.all([
      system.getSelectedFilesInFileExplorer().catch(() => {
        return [];
      }),
      clipboard.hasFiles().then((has) => has ? clipboard.readFiles() : Promise.resolve([]))
    ])).flat();
    console.log("videoPaths", videoPaths);
    videoPaths = Array.from(new Set(videoPaths));
    this.refreshList(videoPaths);
  }
  async onFilesDropped(paths) {
    return this.refreshList(paths);
  }
  async onHighlightedListItemChanged(filePath) {
    const metadata = this.videoMetadata[filePath];
    const metadataLabels = [
      new exports_list_view.ItemDetailMetadataLabel({
        title: "Resolution",
        text: `${metadata.width}x${metadata.height}`
      }),
      new exports_list_view.ItemDetailMetadataLabel({
        title: "Size",
        text: metadata.size ? filesize(metadata.size) : "N/A"
      }),
      genMetadataLabel(metadata, "Average Frame Rate", "avgFrameRate"),
      new exports_list_view.ItemDetailMetadataLabel({
        title: "Bit Rate",
        text: metadata.bitRate ? `${filesize(metadata.bitRate / 8, { bits: true })}/s` : "N/A"
      }),
      genMetadataLabel(metadata, "Bits Per Raw Sample", "bitsPerRawSample"),
      genMetadataLabel(metadata, "Codec", "codec"),
      genMetadataLabel(metadata, "Codec Long Name", "codecLongName"),
      genMetadataLabel(metadata, "Codec Tag", "codecTag"),
      genMetadataLabel(metadata, "Codec Tag String", "codecTagString"),
      genMetadataLabel(metadata, "Codec Type", "codecType"),
      genMetadataLabel(metadata, "Duration", "duration"),
      genMetadataLabel(metadata, "File Path", "filePath"),
      genMetadataLabel(metadata, "Format Long Name", "formatLongName"),
      genMetadataLabel(metadata, "Format Name", "formatName"),
      genMetadataLabel(metadata, "Number Of Frames", "numberOfFrames"),
      genMetadataLabel(metadata, "Number Of Streams", "numberOfStreams"),
      genMetadataLabel(metadata, "Numeric Average Frame Rate", "numericAvgFrameRate"),
      genMetadataLabel(metadata, "Profile", "profile"),
      genMetadataLabel(metadata, "Raw Frame Rate", "rFrameRate"),
      genMetadataLabel(metadata, "Start Time", "startTime"),
      genMetadataLabel(metadata, "Time Base", "timeBase")
    ].filter((label) => label !== null);
    return ui.render(new exports_list_view.List({
      inherits: ["items"],
      detail: new exports_list_view.ItemDetail({
        width: 55,
        children: [new exports_list_view.ItemDetailMetadata(metadataLabels)]
      })
    }));
  }
  async onBeforeGoBack() {
    console.log("onBeforeGoBack, kill api process", this.apiProcess?.pid);
    await this.apiProcess?.kill();
  }
  async onListItemSelected(value) {
    return Promise.resolve();
  }
}
function genMetadataLabel(metadata, title, key) {
  if (!metadata[key])
    return null;
  return new exports_list_view.ItemDetailMetadataLabel({
    title,
    text: typeof metadata[key] === "number" ? Number.isInteger(metadata[key]) ? metadata[key].toString() : metadata[key].toFixed(3).toString() : metadata[key].toString()
  });
}
expose(new VideoInfo);
