// firebase.js
import admin from "firebase-admin";

const serviceAccount = {
  type: "service_account",
  project_id: "rokxd-fc8b5",
  private_key_id: "fad943ea358c9dac06904fe1cae8439be4e04ccf",
  private_key: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDJRtfEDaxxBJS/
7NZaj6Ys/TEWBZyJqqbCiep6rVln7ihncFHv85sLUlMBpeg584S2jWB9Qy/0aru9
hlzsFUxYrFXHH/m6zn5aT0uoDWyOcw/5I1cQAFela4ywYSnaBGmVEkShVJm1WkLb
fvcc0O7v0L/4BRLG401y/XTADnCikhK+8joq6/i9jhCWGewSXRTwf+g7hhGtLsCW
TnnMXT4him26N5Q6ky7RSNi8F48pb8GDQsnQhuk4LvpUYZYxC//lXkkLyCL7QmUa
W1BzzzQqWZFmmwRM2DkG/i6Bpp1utK87IV6R4N7WwgoIG3NAS0xGVGMttezBwyWB
OJL2jEdPAgMBAAECggEAN/51WB1Vs7tKhnokx9zepfVqCm5VNhc7fTNQ///pt3gR
1XTx1oc2wteMMBEvoa+VZBPAnBhs5toqkHcosqTaMHEBC/xhRQ7dJ9KXgZD6ekaY
Uv754YG24FYjNY5STkyb8tS6MweOG12Y6+dOZ73YOu8f+KewqZPin/LS3/skapUq
Pmkb7NKcbSeACqfb+zeSwsJwOmNCmXuYdkdIrfd1aHGnZOYDxXuJ8tN45KNt5alr
mPSlQFO73YbT6kVGW0fDNRXebOk4n80Sxd8Hp70SBTd9H2wN1fUTfFNYrnWedZZ/
TDZ+MPYs48qyZeGfRhL8u8n0+GYFpGbeCg49MsZXAQKBgQDntxQ+4+fWzckmYdOV
XOG4Rv2cFkxB9F5z1RSObwEINNUbb24d0GtHLA4TZX1h8M531hZX7Q2ueTly05mM
CMbcb6ND4wb26j4rUgTMzMBluI3z8WRPB8U/F7MTcAyr/gYcrOXMzOgCByNSVNdj
g842aoihF6xrU88L+OdHkCNc8QKBgQDeXxm1UysX8UlkKg3bGk3lj0NZyCrp8MeC
wlpluwqcmHlW6wGBfHmwZuwzMgjJO3KnNsY/8bnCpcJmICkyQFXI2pZ2r441fOK3
Gfn9NfzPFhzou/cONPhVdseb/4pCnBWCrdQUarW4KfBoKZruty1nbWTabbmN3TWN
x/LV437oPwKBgF/7Y0SFzUQaLAddIHLPbaSSq3zbc60iV3mtuv0hGBFZKSlbKAbr
jXSG2DHKqXxHbo8PPGQhirhJ+LUK16C9BfrLt5poUTs4XpY9PEXFTrEUGKECzeU6
t8bhv0j+8hDQgaGhMPN7sWMdp9Dz2eCb+XBrAruP/djbd3ljGhJ3r15RAoGAEnHY
9A1d+bJt3/0NASuBYpUrhPrxdE4gflwYm2+URcDv76G2kkL85QDkfqqbx/VCYVRN
xWgLfHW7VjU8tYpYkzxuVpHhPdaKB54D+ljMC3FOHI/awjbqkkwz6mCb20KPFjPM
75SaVhhEdJ9e1oYjIf0U7HlFdtruYkA/iDZChIkCgYEAi0uAth3WZbweqPo09yoy
ek8HXxSN6FB2huWohLhrfM0YSJt+ICAQ1chfp+KaJZcxTg3AV5n8Nbm3zRt4XdA1
SM5qqpryZCw5wsl2RnDvs6Xb5U0SyQSF4nC2JEemh6AkIVdWqcNA8Z8MgjMWgP/V
i/O+7onjmzk0WsRXQIlazU0=
-----END PRIVATE KEY-----`,
  client_email: "firebase-adminsdk-fbsvc@rokxd-fc8b5.iam.gserviceaccount.com",
  client_id: "117521637079066974353",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40rokxd-fc8b5.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

export const db = admin.firestore();
