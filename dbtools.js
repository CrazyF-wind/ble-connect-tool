/**
 * Created by fwind on 2017/4/17.
 */
var dbhelper = require('andon-bluetooth-database');

/**
 * 新增扫描记录
 * @param args
 */
exports.insertdb = function (args) {
    dbhelper.insertMongo('BleConnectTimers', args, function (result) {
        if (result === "ok") {
            console.log("新增扫描记录成功！")
        }
        else {
            console.log("新增扫描记录失败，原因：" + result);
        }
    });
}

/**
 * 更新统计数据
 * @param args
 */
exports.updateStatisticsdb = function (mac, flag, mi, mobile, name, inc,callback) {
    dbhelper.updateMongoWithOption('BleConnectStatistics', {
        "mac": mac,
        "flag": flag,
        "mi": mi,
        "mobile": mobile,
        "name": name,
    }, {$inc: inc}, {upsert: true}, function (result) {
        if (result === "ok") {
            console.log("更新统计信息成功！");
            callback()
        }
        else {
            console.log("更新统计信息失败，原因：" + result);
            callback();
        }
    });
}