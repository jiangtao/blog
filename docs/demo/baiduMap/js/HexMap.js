/**
 * @author jiangtao(321jiangtao@gmail.com)
 * @description
 */
;(function (exports) {
    // hexyun内置百度地图通用api
    /**
     * @param opts {Object}
     *
     * ```js
     * new HexMap({
         map: new BMap.Map("allmap"),
         start: start,
         end: end,
         icon: {
            start: {url: 'img/avatar.png', size: [20, 20]},
            end: {url: 'img/logo.png', size: [20, 20]}
        }
     })```
     *
     */
    function HexMap(opts) {
      this.map = opts.map;
      if(opts.start) this.start = this.point(opts.start)
      if(opts.end) this.end = this.point(opts.end)
      
      this.map.centerAndZoom(this.start, 15);
      this.driver = new BMap.DrivingRoute(this.map, {
        renderOptions: {map: this.map, autoViewport: true}
      });
      this._startIcon = null;
      this._endIcon = null;
      this._label = null;
      this.geocoder = new BMap.Geocoder()
      this.labelStyle = opts.labelStyle || {
        color: "#111",
        fontSize: "12px",
        height: "20px",
        lineHeight: "20px",
        fontFamily: "微软雅黑",
        border: "none"
      }

      var icon = opts.icon || {}

      if (icon.start && icon.start.url) {
        this._startIcon = new BMap.Icon(icon.start.url, new BMap.Size(icon.start.size[0], icon.start.size[1]))
      }
      if (icon.end && icon.end.url) {
        this._endIcon = new BMap.Icon(icon.end.url, new BMap.Size(icon.end.size[0], icon.end.size[1]))
      }
    }

    HexMap.point = function (coord) {
      return new BMap.Point(coord[0], coord[1])
    }
    HexMap.prototype.point = function (coord) {
      return HexMap.point(coord)
    }
    /**
     * @description 两个点的位置连线，自带距离属性，用实时位置展示效果
     * @param start {Array} 起始经纬度
     * @param end {Array} 终点经纬度
     */
    HexMap.prototype.drive = function (start, end) {
      var self = this
      start = start ? this.point(start) : this.start
      end = end ? this.point(end) : this.end

      this.driver.search(start, end); //显示一条公交线路
      this.driver.setSearchCompleteCallback(function () {
        self.labelDistance(start, end);
      });
      this.driver.setMarkersSetCallback(function (result) {
        if (self._startIcon) result[0].marker.setIcon(self._startIcon)
        if (self._endIcon) result[1].marker.setIcon(self._endIcon)
      });
    }
    HexMap.prototype.getLocation = function (point) {
      var self = this
      return new Promise(function (resolve, reject) {
        self.geocoder.getLocation(point, function (rs) {
          resolve(rs)
        })
      })
    }
    /**
     * 
     * @param rs {Object} 百度坐标返回的地址位置信息
     * @param coord {Array/Point} 百度坐标经纬度
     * @return marker {BMap.Marker} 返回一个maker
     */
    HexMap.prototype.markPointInfo = function(rs, coord) {
      var self = this
      var addComp = rs.addressComponents;
      var province = addComp.province;//获取省份
      var city = addComp.city;//获取城市
      var district = addComp.district;//区
      var street = addComp.street;//街
      var streetNumber = addComp.streetNumber
      var opts = {
        width: 40,     // 信息窗口宽度  
        height: 90,     // 信息窗口高度  
        title: "现在的位置:<hr />"  // 信息窗口标题  
      }
      var point
      
      if(coord instanceof  BMap.Point) {
        point = coord
      } else if(coord instanceof  Array) {
        point = this.point(coord)
      }
      console.log(addComp)
      
      var marker = new BMap.Marker(point);  //事件类
      var infoWindow = new BMap.InfoWindow(province + city  + district  + street + streetNumber + "<br />", opts);

      this.map.openInfoWindow(infoWindow, point);
      return {
        marker: marker,
        infoWindow: infoWindow,
        point: point,
        coord: coord
      }
    }
    /**
     * 
     * @param start {Array} 起点百度坐标
     * @param end {Array} 终点百度坐标
     */
    HexMap.prototype.labelDistance = function (start, end) {
      var d = (this.map.getDistance(start, end) / 1000).toFixed(2);
      var content = "距离目标" + d + "km";

      if (!this.label) {
        var opts = {
          position: start, // 指定文本标注所在的地理位置
          offset: new BMap.Size(-40, -40) //设置文本偏移量
        };
        this.label = new BMap.Label(content, opts);
        this.label.setStyle(this.labelStyle);
        this.map.addOverlay(this.label)
      } else {
        this.label.setContent(content);
        this.label.setPosition(start);
      }
    }
    /**
     * @description 修复GPS坐标到百度坐标
     * @param coords {Array}
     */
    HexMap.fixCoords = function (coords) {
      var convertor = new BMap.Convertor();
      var pointArr = [];
      pointArr.push(new BMap.Point(coords[0], coords[1]));
      return new Promise(function (resolve, reject) {
        convertor.translate(pointArr, 1, 5, function (data) {
          if (data.status === 0) {
            resolve([data.points[0].lng, data.points[0].lat])
          } else {
            reject({
              code: -101,
              message: '百度地图坐标转换失败'
            })
          }
        })
      })
    }
    HexMap.locate = function () {
      return new Promise(function (resolve, reject) {
        if (window.navigator.geolocation) {
          window.navigator.geolocation.getCurrentPosition(function (data) {
            return resolve(HexMap.fixCoords([data.coords.longitude, data.coords.latitude]))
          }, reject);
        } else {
          reject(new Error({
            code: -10000,
            message: '您的浏览器不支持地理定位'
          }))
        }
      })
    }
    exports.HexMap = HexMap
  }
)(window)