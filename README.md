
# fiss-command-init

基于 [fisx-command-init](https://github.com/wuhy/fisx-command-init)，保持 fisx-command-init 原有功能不变，对初始化的工程及文件模板做相应的改动。

## 模板说明

### 工程模板

工程模板预设有基本的目录结构和配置文件。同时配置文件也进行了预配置，可以通过简单修改即可快速使用。

* [simple-m](https://github.com/fiss-scaffold/simple-m): 一个简单的移动端工程模板，js 不使用 AMD/CMD 等进行模块化开发
* [sample-amd](https://github.com/fiss-scaffold/sample-amd): 一个使用 AMD 进行模块化开发的工程模板
* [sample-use-components](https://github.com/fiss-scaffold/sample-use-components): 一个使用 **[fecom](https://github.com/icefox0801/fecom)** 进行对组件进行管理的工程模板


### 文件模板

- html: 创建一个包含基本结构的 html 文件
- js: 创建一个 javascript 文件，可以选择是否是使用 AMD 模块定义规范，yes 则创建一个 AMD 模块
- amd: 创建一个 amd 模块