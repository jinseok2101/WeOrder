module.exports = ({ config }) => {
  return {
    ...config,
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios.infoPlist,
        NMFClientId: process.env.NAVER_CLIENT_ID || "키를_입력해주세요",
      }
    },
    android: {
      ...config.android,
      metaData: {
        ...config.android?.metaData,
        "com.naver.maps.map.CLIENT_ID": process.env.NAVER_CLIENT_ID || "키를_입력해주세요",
      }
    }
  };
};
