/* 天气：Open-Meteo（免费、无需密钥、支持跨域）+ 浏览器定位
   仅在查看最近 7 天时显示；离线时用缓存或隐藏。 */
(function () {
  'use strict';

  var KEY = 'xieji.wx';
  var TTL = 30 * 60 * 1000;

  /* WMO 天气码 → 中文 + 图标类别 */
  var WMO = {
    0: ['晴', 'sun'], 1: ['晴间多云', 'sun'], 2: ['多云', 'cloud'], 3: ['阴', 'cloud'],
    45: ['雾', 'fog'], 48: ['雾凇', 'fog'],
    51: ['毛毛雨', 'drizzle'], 53: ['毛毛雨', 'drizzle'], 55: ['毛毛雨', 'drizzle'],
    56: ['冻雨', 'drizzle'], 57: ['冻雨', 'drizzle'],
    61: ['小雨', 'rain'], 63: ['中雨', 'rain'], 65: ['大雨', 'rain'],
    66: ['冻雨', 'rain'], 67: ['冻雨', 'rain'],
    71: ['小雪', 'snow'], 73: ['中雪', 'snow'], 75: ['大雪', 'snow'], 77: ['雪粒', 'snow'],
    80: ['阵雨', 'rain'], 81: ['阵雨', 'rain'], 82: ['强阵雨', 'rain'],
    85: ['阵雪', 'snow'], 86: ['阵雪', 'snow'],
    95: ['雷阵雨', 'thunder'], 96: ['雷阵雨伴冰雹', 'thunder'], 99: ['雷暴伴冰雹', 'thunder']
  };

  var S = {
    city: '', lat: null, lon: null, tz: 'Asia/Shanghai',
    hourly: {}, daily: {}, updated: 0, status: 'idle', err: '', src: ''
  };

  function load() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (o && o.hourly) {
        S.city = o.city || ''; S.lat = o.lat; S.lon = o.lon; S.tz = o.tz || S.tz;
        S.daily = o.daily || {}; S.updated = o.updated || 0; S.status = 'ok';
        /* 兼容旧缓存：把 2026-11-22T13:00 折成 2026-11-22T13 */
        S.hourly = {};
        for (var k in o.hourly) if (Object.prototype.hasOwnProperty.call(o.hourly, k)) S.hourly[k.slice(0, 13)] = o.hourly[k];
      }
    } catch (e) { }
  }
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        city: S.city, lat: S.lat, lon: S.lon, tz: S.tz,
        hourly: S.hourly, daily: S.daily, updated: S.updated
      }));
    } catch (e) { }
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function kOf(y, m, d, h) { return y + '-' + pad(m) + '-' + pad(d) + 'T' + pad(h); }

  /* 定位：先浏览器定位，失败退回 IP 定位 */
  function geo() {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) return reject(new Error('no-geo'));
      navigator.geolocation.getCurrentPosition(
        function (p) { resolve({ lat: p.coords.latitude, lon: p.coords.longitude, src: 'gps' }); },
        function (e) { reject(e); },
        { timeout: 8000, maximumAge: 10 * 60 * 1000, enableHighAccuracy: false }
      );
    });
  }
  function ipGeo() {
    /* ipapi.co 在部分网络下不可达，改用 ipwho.is */
    return fetch('https://ipwho.is/', { cache: 'no-store' }).then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || j.success === false || typeof j.latitude !== 'number') throw new Error('ip-fail');
        return { lat: j.latitude, lon: j.longitude, city: j.city || j.region || '', src: 'ip' };
      });
  }
  function reverse(lat, lon) {
    return fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' + lat +
      '&longitude=' + lon + '&localityLanguage=zh', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var c = (j && (j.city || j.locality || j.principalSubdivision)) || '';
        return c;
      })
      .catch(function () { return ''; });
  }

  function fetchWx() {
    var u = 'https://api.open-meteo.com/v1/forecast?latitude=' + S.lat + '&longitude=' + S.lon +
      '&hourly=temperature_2m,weather_code,precipitation_probability' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min' +
      '&timezone=auto&forecast_days=7';
    return fetch(u, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.hourly) throw new Error('bad-data');
      S.tz = j.timezone || S.tz;
      S.hourly = {}; S.daily = {};
      var t = j.hourly.time || [];
      for (var i = 0; i < t.length; i++) {
        /* API 给的是 2026-11-22T13:00，统一截到小时 */
        S.hourly[String(t[i]).slice(0, 13)] = {
          t: j.hourly.temperature_2m ? j.hourly.temperature_2m[i] : null,
          c: j.hourly.weather_code ? j.hourly.weather_code[i] : 0,
          p: j.hourly.precipitation_probability ? j.hourly.precipitation_probability[i] : null
        };
      }
      var dt = j.daily && j.daily.time ? j.daily.time : [];
      for (var k = 0; k < dt.length; k++) {
        S.daily[dt[k]] = {
          c: j.daily.weather_code[k],
          max: j.daily.temperature_2m_max[k],
          min: j.daily.temperature_2m_min[k]
        };
      }
      S.updated = Date.now();
      persist();
    });
  }

  /* forceGeo=true 才重新定位；已有坐标（含手动设的城市）直接用 */
  function locateAndFetch(forceGeo) {
    if (!forceGeo && S.status === 'ok' && S.hourly && (Date.now() - S.updated) < TTL) return Promise.resolve(S);
    S.status = 'loading'; S.err = '';
    var p;
    if (!forceGeo && S.lat !== null && S.lon !== null) {
      p = Promise.resolve();
    } else {
      var denied = false;
      p = geo().catch(function (e) {
        denied = true;
        return ipGeo();
      }).then(function (o) {
        S.lat = o.lat; S.lon = o.lon; S.src = o.src; S.updated = 0;
        if (o.city) { S.city = o.city; return; }
        return reverse(o.lat, o.lon).then(function (c) { if (c) S.city = c; });
      }).catch(function (e) {
        var err = new Error(denied ? '未获得定位权限' : '定位失败');
        err.cause = e;
        throw err;
      });
    }
    return p.then(fetchWx).then(function () {
      S.status = 'ok'; persist(); return S;
    }).catch(function (e) {
      S.status = S.hourly && S.updated ? 'stale' : 'error';
      S.err = (e && e.message) || 'fail';
      return S;
    });
  }

  function setCity(name, lat, lon) {
    S.city = name; S.lat = lat; S.lon = lon; S.updated = 0;
    return locateAndFetch(false);   /* 已给坐标，不再定位 */
  }

  function searchCity(q) {
    return fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) +
      '&count=1&language=zh&format=json')
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var it = j && j.results && j.results[0];
        if (!it) throw new Error('no-city');
        return setCity(it.name + (it.admin1 && it.admin1 !== it.name ? '·' + it.admin1 : ''), it.latitude, it.longitude);
      });
  }

  /* ---------- 取数 ---------- */
  function dayKey(y, m, d) { return y + '-' + pad(m) + '-' + pad(d); }
  function forDay(y, m, d) {
    var dd = S.daily[dayKey(y, m, d)];
    var nowH = new Date().getHours();
    var hh = S.hourly[kOf(y, m, d, nowH)] || S.hourly[kOf(y, m, d, 12)];
    if (!dd && !hh) return null;
    return {
      c: dd ? dd.c : (hh ? hh.c : 0),
      max: dd ? dd.max : null, min: dd ? dd.min : null,
      t: hh ? hh.t : null, p: hh ? hh.p : null
    };
  }
  /* 时辰：子 23 点起，其余 2h-1 */
  function forHour(y, m, d, zhi) {
    var h0 = zhi === 0 ? 23 : 2 * zhi - 1;
    var a = S.hourly[kOf(y, m, d, h0)], b = S.hourly[kOf(y, m, d, h0 + 1)];
    if (!a && !b) return null;
    var pick = a || b;
    var t = (a && b && a.t != null && b.t != null) ? Math.round((a.t + b.t) / 2) : pick.t;
    var c = (b && b.c > (a ? a.c : 0)) ? b.c : (a ? a.c : pick.c);
    return { c: c, t: t, p: pick.p, label: (WMO[c] || ['', 'cloud'])[0] };
  }
  function forNow(y, m, d, zhi) {
    var h = new Date().getHours();
    var o = S.hourly[kOf(y, m, d, h)];
    if (!o) return null;
    return { c: o.c, t: o.t, p: o.p, label: (WMO[o.c] || ['', 'cloud'])[0] };
  }

  /* ---------- 图标（纯 CSS 动画） ---------- */
  function icon(kind, big) {
    var k = kind || 'cloud';
    var cls = 'wx-i ' + k + (big ? ' lg' : '');
    var inner = (k === 'rain' || k === 'snow' || k === 'drizzle' || k === 'thunder')
      ? '<span class="d"><i></i></span>' : '';
    return '<span class="' + cls + '" aria-hidden="true">' + inner + '</span>';
  }
  function text(c) { return (WMO[c] || ['未知', 'cloud'])[0]; }
  function kindOf(c) { return (WMO[c] || ['', 'cloud'])[1]; }

  window.XWX = {
    state: S, init: load, load: locateAndFetch, setCity: setCity, searchCity: searchCity,
    forDay: forDay, forHour: forHour, forNow: forNow, icon: icon, text: text, kindOf: kindOf,
    fresh: function () { return Date.now() - S.updated < TTL; }
  };
})();
