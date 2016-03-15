/**
 * @file 脚手架工具
 * @author sparklewhy@gmail.com
 */

/* eslint-disable fecs-camelcase */

var path = require('path');
var Promise = require('bluebird');
var tplLoader = require('./template');
var util = require('./util');
var _ = fis.util;

/**
 * 判断一个模块是否已经安装过
 * @param  {String}  moduleName 需要判断的模块的名字
 * @return {Boolean}            已安装返回true，否则返回false
 */
function isModuleAvailableSync(moduleName) {
    try {
        if (require.resolve(moduleName)) {
            return true;
        } else {
            return false;
        }
    } catch (e) {
        //console.error("%s is not found", moduleName);
        //process.exit(e.code);
        return false;
    }
}

/**
 * 判断cnpm是否存在，不存在安装 cnpm
 *
 * @param {Object} options 选项
 * @param {Object} info 模板信息
 * @return {Promise|Object}
 */
function installCnpm(options, info) {
    var packageJson = path.join(options.root, 'package.json');

    if (!util.isFileExists(packageJson)) {
        return info;
    }

    try {
        var config = require(packageJson);
        if (config.useNpmInstall) {
            //如果在package.json配置useNpmInstall:true,则不用cnpm安装
            return info;
        }
        fis.log.info('use cnpm install dependencies ...');
        //判断cnpm是否安装
        if (isModuleAvailableSync('cnpm')) {
            //cnpm已经安装
            fis.log.info('cnpm has installed ...')
            return info;
        } else {
            //cnpm 没有安装，需要安装到global
            return new Promise(function(resolve, reject) {
                var child_process = require('child_process');
                var spawn = child_process.spawn;
                var npm = _.isWin() ? 'npm.cmd' : 'npm';
                fis.log.info('now install cnpm to global ...');
                //最新版本的cnpm是用es6写的，低版本的node不支持
                var install = spawn(npm, ['install', 'cnpm@3.4.1', '-g'], {
                    cwd: options.root
                });

                install.stdout.pipe(process.stdout);
                install.stderr.pipe(process.stderr);
                install.on('error', function(reason) {
                    reject(reason);
                });
                install.on('close', function() {
                    resolve(info);
                });
            });
        }
    } catch (ex) {
        fis.log.warn(ex);
    }

}

/**
 * 安装 npm 依赖
 *
 * @param {Object} options 选项
 * @param {Object} info 模板信息
 * @return {Promise|Object}
 */
function installNPMDependence(options, info) {
    var packageJson = path.join(options.root, 'package.json');

    if (!util.isFileExists(packageJson)) {
        return info;
    }

    try {
        var config = require(packageJson);
        if (config.dependencies || config.devDependencies) {
            fis.log.info('Installing npm dependencies...');

            // run `npm/cnpm install`
            return new Promise(function (resolve, reject) {
                var child_process = require('child_process');
                var spawn = child_process.spawn;
                var npm = _.isWin() ? 'cnpm.cmd' : 'cnpm';
                if(config.useNpmInstall){
                    npm = _.isWin() ? 'npm.cmd' : 'npm';
                }
                var install = spawn(npm, ['install'], {
                    cwd: options.root
                });

                install.stdout.pipe(process.stdout);
                install.stderr.pipe(process.stderr);
                install.on('error', function (reason) {
                    reject(reason);
                });
                install.on('close', function () {
                    resolve(info);
                });
            });
        }
    }
    catch (ex) {
        fis.log.warn(ex);
    }
}

/**
 * 安装项目依赖组件
 *
 * @param {Object} options 选项
 * @param {string} solutionName 方案名称
 * @param {Object} info 模板信息
 * @return {Promise|Object}
 */
function installProjectComponents(options, solutionName, info) {
    var pkgInfo = util.getProjectInfo();
    var deps = (pkgInfo[solutionName] || {}).dependencies;

    if (!deps || _.isEmpty(deps)) {
        return info;
    }

    return new Promise(function (resolve, reject) {
        var child_process = require('child_process');
        var spawn = child_process.spawn;
        fis.log.info('Installing project components...');

        // '/usr/local/bin/node', '/usr/local/bin/fisx', 'install'
        var install = spawn(process.execPath, [process.argv[1], 'install']);
        install.stdout.pipe(process.stdout);
        install.stderr.pipe(process.stderr);

        install.on('error', function (reason) {
            fis.log.warn(reason);
            resolve(info);
        });

        install.on('close', function () {
            resolve(info);
        });
    });
}

/**
 * 初始化项目根目录
 *
 * @param {string} fisConfigFile  配置文件
 * @param {Object} options 选项
 * @return {Promise}
 */
function initProjectRoot(fisConfigFile, options) {
    var findup = require('findup');
    return new Promise(function (resolve, reject) {
        var fup = findup(options.root, fisConfigFile);
        var dir = null;

        fup.on('found', function (found) {
            dir = found;
            fup.stop();
        });

        fup.on('error', reject);

        fup.on('end', function () {
            resolve(dir);
        });
    }).then(
        function (dir) {
            return dir;
        }
    ).then(
        function (dir) {
            if (dir && !util.isEmptySync(dir) && !options.force) {
                var reason = 'The inited director ' + dir + ' is not empty'
                    + ', if you want to force initialize, please use `--force` option.';
                return Promise.reject(reason);
            }

            return dir;
        }
    );
}

function initProject(scaffold, options) {
    return Promise.try(initProjectRoot.bind(this, options.fisConfigFile, options))
        .then(function (dir) {
            dir && (options.root = dir);
            options.target = options.root;
            fis.project.setProjectRoot(options.root);

            fis.log.info('Init project in dir: %s', options.target);
            return tplLoader.load(scaffold, options);
        })
        .then(installCnpm.bind(this,options))
        .then(installNPMDependence.bind(this, options))
        .then(installProjectComponents.bind(this, options, options.solutionName))
        .then(function () {
            /**
             * @event scaffold:initdone 初始化完成的事件
             */
            fis.emit('scaffold:initdone', options);

            fis.log.info('Init project done.\n');
        }).catch(function (err) {
            fis.log.warn(err);
            fis.log.info('Init project fail.\n');
        });
}

function initFile(scaffold, tpl, options) {
    return Promise.try(function () {
        var target = options.target;
        if (!options.force) {
            var state = util.getFileState(target);
            if (state && state.isFile()) {
                return Promise.reject('The inited file ' + target + ' is existed'
                    + ', if you want to override, please use `--force` option.');
            }
            else if (state && state.isDirectory() && !util.isEmptySync(target)) {
                return Promise.reject('The inited directory ' + target + ' is existed'
                    + ', if you want to override, please use `--force` option.');
            }
        }

        return tplLoader.load(scaffold, options);
    }).then(function () {
        /**
         * @event scaffold:initdone 初始化完成的事件
         */
        fis.emit('scaffold:initdone', options);

        if (options.printInfo) {
            fis.log.info(options.printInfo);
        }

        fis.log.info('Init %s done.\n', tpl);
    }).catch(function (err) {
        fis.log.warn(err);
        fis.log.info('Init %s fail.\n', tpl);
    });
}

/**
 * 初始化脚手架
 *
 * @param {string} tpl 要使用的模板
 * @param {Object} options 初始化选项
 */
exports.init = function (tpl, options) {
    var template = tplLoader.parse(tpl, options);
    options.template = template;

    var Scaffold = require('fis-scaffold-kernel');
    var templateOpt = template.type && template.type.options;
    if (_.isFunction(templateOpt)) {
        templateOpt = templateOpt();
    }
    var scaffold = new Scaffold(_.assign({
        type: !template.isLocal && template.type && template.type.value,
        log: {
            level: 0x0010
        }
    }, templateOpt || {}));
    scaffold.sourceOption = templateOpt;

    if (options.isFileTemplate) {
        initFile(scaffold, tpl, options);
    }else {
        initProject(scaffold, options);
    }
};

/* eslint-enable fecs-camelcase */
