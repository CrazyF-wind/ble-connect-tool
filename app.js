/**
 * Created by fwind on 2017/4/17.
 */
var spawn = require('child_process').spawn;
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var dbtools = require("./dbtools.js")
var LeScanner = require("andon-bluetooth-oncelescan-temp");


var BluetoothScanner = module.exports = function (option, callback) {
    var self = this;

    // Inherit EventEmitter
    EventEmitter.call(self);

    self.init = function (option) {
        console.log("input info:" + JSON.stringify(option));
        //初始化参数
        var hcidev = 'hci0';
        var macAddr = option['mac'];
        var mobile = option['mobile'];
        var devicename = option['name'];
        var mi = Number(option['mi']);
        var flag = option['flag'];
        var mobileopt = option['mobileopt'];

        var record_time = new Date().getTime();
        var lescan_time = 0;
        var handleValue = 0;
        var RSSI = 0;
        var connect_time = 0;

        /**
         * 启动dongle
         */
        startup_dongle(function (data) {
            if (data["result"] === 1) {
                console.log(`start_dongle:${JSON.stringify(data)}`)
                /**
                 * 开始扫描
                 */
                start_ble_scan(function (data) {
                    console.log(`start_ble_scan:${JSON.stringify(data)}`)
                    if (data["result"] === 1) {
                        var RSSI = data["value"]["RSSI"];
                        var lescan_time = data["value"]["lescan_time"];
                        /**
                         * 连接ble设备
                         */
                        connect_ble_device(RSSI,lescan_time,function (data) {
                            console.log(`connect_ble_device:${JSON.stringify(data)}`)
                            var handleValue = data["value"]["handleValue"];
                            var connect_time = data["value"]["connect_time"];
                            if (data["result"] === 1) {
                                /**
                                 * 断开ble设备
                                 */
                                disconnect_ble_device(handleValue,RSSI,lescan_time,connect_time,function (data) {
                                    console.log(`disconnect_ble_device:${JSON.stringify(data)}`)
                                    if (data["result"] === 1) {
                                        /**
                                         * 关闭dongle
                                         */
                                        close_dongle(function (data) {
                                            console.log(`close_dongle:${JSON.stringify(data)}`)
                                            if (data["result"] === 1) {
                                                callback({
                                                    "result": 0,
                                                    "value": "成功！连接时间：" + connect_time + "ms，扫描时间：" + lescan_time + "ms，信号强度："+RSSI+"！"
                                                })
                                            } else {
                                                //返回dongle关闭失败情况
                                                callback({
                                                    "result": 5,
                                                    "value": "蓝牙断开失败！连接时间：" + connect_time + "ms，扫描时间：" + lescan_time + "ms，信号强度："+RSSI+"！"
                                                })
                                            }
                                        })
                                    } else {
                                        close_dongle(function (data) {
                                            console.log(`close_dongle:${JSON.stringify(data)}`)
                                            if(data["result"] === 1){
                                                //返回断开失败情况
                                                callback({
                                                    "result": 4,
                                                    "value": "设备断开失败！连接时间：" + connect_time + "ms，扫描时间：" + lescan_time + "ms，信号强度："+RSSI+"！"
                                                })
                                            }else {
                                                //返回dongle关闭失败情况
                                                callback({
                                                    "result": 5,
                                                    "value": "蓝牙断开失败！连接时间：" + connect_time + "ms，扫描时间：" + lescan_time + "ms，信号强度："+RSSI+"！"
                                                })
                                            }
                                        })

                                    }
                                })
                            } else {
                                close_dongle(function (data) {
                                    console.log(`close_dongle:${JSON.stringify(data)}`)
                                    if(data["result"] === 1){
                                        //返回连接失败情况
                                        callback({
                                            "result": 3,
                                            "value": "连接失败！扫描时间：" + lescan_time + "ms！"
                                        })
                                    }else {
                                        //返回dongle关闭失败情况
                                        callback({
                                            "result": 5,
                                            "value": "蓝牙断开失败！扫描时间：" + lescan_time + "ms！"
                                        })
                                    }
                                })
                            }
                        })
                    } else {
                        close_dongle(function (data) {
                            console.log(`close_dongle:${JSON.stringify(data)}`)
                            if(data["result"] === 1){
                                //返回扫描失败情况
                                callback({
                                    "result": 2,
                                    "value": "扫描失败！"
                                })
                            }else {
                                //返回dongle关闭失败情况
                                callback({
                                    "result": 5,
                                    "value": "蓝牙断开失败！"
                                })
                            }
                        })

                    }
                })
            } else {
                close_dongle(function (data) {
                    console.log(`close_dongle:${JSON.stringify(data)}`)
                    if(data["result"] === 1){
                        //返回dongle启动失败情况
                        callback({
                            "result": 1,
                            "value": "蓝牙启动失败！"
                        })
                    }else {
                        //返回dongle关闭失败情况
                        callback({
                            "result": 5,
                            "value": "蓝牙断开失败！"
                        })
                    }
                })

            }
        })

        /**
         * 启动蓝牙适配器
         * @param callback
         */
        function startup_dongle(callback) {
            // Bring selected device UP
            var hciconfig = spawn('hciconfig', [hcidev, 'up']);
            hciconfig.on("exit", function (code) {
                if (code !== 0) {   //启动蓝牙适配器失败
                    console.log("hcitool Device " + hcidev + "up fail!");
                    //写入统计库
                    dbtools.updateStatisticsdb(macAddr, flag, mi, mobile, devicename,
                        {
                            "deviceup_failed": 1
                        });
                    callback({"result": 0, "value": "蓝牙启动失败！"});
                }
                else {              //启动蓝牙适配器成功console.log("Device " + hcidev + "up suceed!");
                    callback({"result": 1, "value": "ok"});
                }
            })
        }

        /**
         * 扫描ble设备
         * @param callback
         */
        function start_ble_scan(callback) {
            console.log("Device " + hcidev + "up suceed!");
            //扫描参数
            var scan_params = {
                "mac": macAddr,
                "flag": flag,
                "mi": mi,
                "mobile": mobile,
                "name": devicename,
                "parameter": {
                    "interval": mobileopt["scan-interval"],
                    "window": mobileopt["scan-window"]
                }
            };
            //扫描mac
            bleScanner=new LeScanner(scan_params, function (data) {
                console.log("返回扫描结果:" + JSON.stringify(data));
                if (data["value"] === "succeed") {
                    var RSSI = data["RSSI"];
                    var lescan_time = data["LeScanEndtime"] - data["LeScanBegintime"];
                    console.log("扫描:" + macAddr + ",成功！扫描时间：" + lescan_time + "ms");
                    //写入统计库
                    dbtools.updateStatisticsdb(macAddr, flag, mi, mobile, devicename, {
                        "lescan": 1
                    },function() {
                        callback({"result": 1, "value": {"RSSI": RSSI, "lescan_time": lescan_time}})
                    });

                } else {
                    console.log("扫描:" + macAddr + ",失败！");
                    dbtools.updateStatisticsdb(macAddr, flag, mi, mobile, devicename, {
                        "lescan_failed": 1,
                    },function() {
                        callback({"result": 0, "value": "failed"})
                    });
                }
            })
        }

        /**
         * 连接ble设备
         * @param callback
         */
        function connect_ble_device(RSSI,lescan_time,callback) {
            //begin Connect
            var begin_time = new Date();
            var end_time = new Date();
            //如果mac不是公共的（00开头），需要加参数--random 去连接
            //var hciToolScan = spawn('hcitool', ['EdInt',"--random",macAddr, mobileopt["connect-interval"], mobileopt["connect-window"], mobileopt["connect-min_interval"], mobileopt["connect-max_interval"]]);
            var hciToolEdInt = spawn('hcitool', ['EdInt', macAddr, mobileopt["connect_interval"], mobileopt["connect_window"], mobileopt["connect_min_interval"], mobileopt["connect_max_interval"]]);
            console.log("hcitool lecc(EdInt): started..." + ['EdInt', macAddr, mobileopt["connect_interval"], mobileopt["connect_window"], mobileopt["connect_min_interval"], mobileopt["connect_max_interval"]]);
            hciToolEdInt.stdout.on('data', function (data) {
                if (data.length) {
                    end_time = new Date();
                    console.log("\t连接成功!设备名称:" + devicename + "|mac:" + macAddr + "|RSSI:" + RSSI);
                    var connect_time = (end_time.getTime() - begin_time.getTime());
                    data = data.toString('utf-8');
                    var handleValue = data.replace("Connection handle ", "");
                    handleValue = handleValue.replace("/n", "");
                    console.log("handlevalue:" + handleValue);

                    //扫描记录存库、handle更新，返回成功结果
                    //updatahandledb(handleValue);
                    console.log('\t' + "连接时间：" + connect_time + "ms，扫描时间：" + lescan_time + "ms");

                    callback({
                        "result": 1,
                        "value": {
                            "lescan_time": lescan_time,
                            "RSSI": RSSI,
                            "handleValue": handleValue,
                            "connect_time": connect_time
                        }
                    })
                }
            });

            hciToolEdInt.on("exit", function (code) {
                console.log("exit:" + code);
                if (code !== 0) {
                    //连接失败
                    console.log("lecc(edint) " + macAddr + " failed!");
                    var args = {
                        "mac": macAddr,
                        "flag": flag,
                        "name": devicename,
                        "mi": mi,
                        "time": record_time,
                        "mobile": mobile,
                        "LescanTime": lescan_time,
                        "RSSI": RSSI,
                        "isConnect": 0
                    };
                    dbtools.insertdb(args);
                    callback({
                        "result": 0,
                        "value": {
                            "lescan_time": lescan_time,
                            "RSSI": RSSI
                        }
                    })
                }
                else {
                    console.log('\t' + "连接成功！退出时间:" + (new Date().getTime() - begin_time) + "ms");
                }
            });
        }

        /**
         * 断开ble设备
         * @param handleValue
         * @param callback
         */
        function disconnect_ble_device(handleValue,RSSI,lescan_time,connect_time,callback) {
            var handleEndtime = new Date();
            console.log("disconnect_handleValue:"+handleValue)
            var hciTool_ledc = spawn('hcitool', ['ledc', handleValue]);
            hciTool_ledc.on('exit', function (code) {
                var disconnect_time = (new Date().getTime() - handleEndtime);
                console.log('\t' + "断开成功!断开时间:" + disconnect_time + "ms");
                if (code !== 0) {
                    console.log("lecc succeed ledc failed!");
                    //写入统计库
                    dbtools.updateStatisticsdb(macAddr, flag, mi, mobile, devicename, {
                        "ledc_failed": 1,
                        "lecc": 1
                    }, function (data) {
                        callback({"result": 0, "value": "关闭ble失败！"});
                    });
                } else {
                    console.log("lecc succeed ledc succeed!");
                    //写入统计库
                    dbtools.updateStatisticsdb(macAddr, flag, mi, mobile, devicename, {
                        "ledc_success": 1,
                        "lecc": 1
                    }, function () {
                        callback({"result": 1, "value": "断开ble成功！"});
                    });
                }

                var args = {
                    "mac": macAddr,
                    "ConnectionTime": connect_time,
                    "DisconnectTime": disconnect_time,
                    "flag": flag,
                    "name": devicename,
                    "mi": mi,
                    "time": record_time,
                    "mobile": mobile,
                    "LescanTime": lescan_time,
                    "RSSI": RSSI,
                    "isConnect": 1
                };
                dbtools.insertdb(args);
            })
        }

        /**
         * 关闭蓝牙适配器
         * @param callback
         */
        function close_dongle(callback) {
            var hciconfig = spawn('hciconfig', [hcidev, 'down']);
            hciconfig.on("exit", function (code) {
                if (code !== 0) {
                    console.log("hcitool Device " + hcidev + "down fail!");
                    //写入统计库
                    dbtools.updateStatisticsdb(macAddr, flag, mi, mobile, devicename, {
                        "devicedown_failed": 1
                    },function() {
                        callback({"result": 0, "value": "关闭dongle失败！"});
                    });
                }
                else {
                    console.log("hcitool Device " + hcidev + "down suceed!");
                    //写入统计库
                    dbtools.updateStatisticsdb(macAddr, flag, mi, mobile, devicename, {
                        "devicedown_success": 1
                    }, function () {
                        callback({"result": 1, "value": "关闭dongle成功！"});
                    });
                }
            });
        }
    };
    self.init(option);
};
util.inherits(BluetoothScanner, EventEmitter);

