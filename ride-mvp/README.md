# Ride-hailing Microservices MVP 
MVP này bám sát các khối trong hình:
- **Client Layer**: (chưa build UI React trong repo này) – bạn có thể gọi API bằng Postman/curl.
- **API Gateway (NodeJS + WebSocket)**: `gateway` (REST proxy + Socket.IO).
- **Microservices**: `auth-service`, `user-service`, `pricing-service`, `ride-service`, `payment-service`, `notification-service`, `review-service`.
- **Data Layer**: PostgreSQL, MongoDB, Redis.
- **Message Broker**: RabbitMQ (thay Kafka cho đơn giản MVP).

## 1) Chạy toàn bộ hệ thống
Yêu cầu: cài Docker + Docker Compose.

```bash
cd ride-mvp
docker compose up --build
```

Sau khi lên xong:
- API Gateway: `http://localhost:8080`
- RabbitMQ UI: `http://localhost:15672` (user/pass: guest/guest)

## 2) Flow MVP (đúng ý nghĩa các event trong hình)
1) Customer đăng ký/đăng nhập -> lấy JWT
2) Customer gọi **pricing estimate**
3) Customer tạo ride -> `RideCreated` event được bắn lên RabbitMQ
4) Notification service lắng nghe -> đẩy realtime về Gateway -> WebSocket client nhận
5) Customer gọi pay -> `PaymentSuccess` event
6) Ride service lắng nghe `PaymentSuccess` -> update trạng thái ride = `CONFIRMED` và bắn `RideStatusChanged`
7) Notification service đẩy realtime status về client

## 3) Test nhanh bằng curl

### 3.1 Đăng ký
```bash
curl -X POST http://localhost:8080/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@example.com","password":"1234","fullName":"Tien Vo","role":"customer"}'
```

### 3.2 Đăng nhập
```bash
curl -X POST http://localhost:8080/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@example.com","password":"1234"}'
```
Copy `token` trả về và export:
```bash
export TOKEN='PASTE_TOKEN_HERE'
```

### 3.3 Ước tính giá
```bash
curl "http://localhost:8080/pricing/estimate?distanceKm=7"
```

### 3.4 Tạo chuyến đi
```bash
curl -X POST http://localhost:8080/rides \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"origin":"IUH","destination":"Ben Thanh","priceEstimate":50000}'
```

### 3.5 Thanh toán (giả lập)
```bash
curl -X POST http://localhost:8080/payments/pay \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"rideId":"PASTE_RIDE_ID","amount":50000}'
```

### 3.6 Xem danh sách ride của mình
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/rides
```

## 4) Test realtime WebSocket (Socket.IO)
Client phải connect tới Gateway và gửi JWT trong handshake auth.
Nếu bạn muốn, mình sẽ viết luôn 1 file `ws-test.js` để bạn chạy và thấy event realtime.

## 5) Map service ↔ hình kiến trúc
- **Auth Service**: `/auth/register`, `/auth/login`
- **User Service**: `/users/me`
- **Pricing Service**: `/pricing/estimate`
- **Ride Service**: `/rides` (create/list), `/rides/:id/status` (driver update)
- **Payment Service**: `/payments/pay` => bắn `PaymentSuccess`
- **Notification Service**: consume `RideCreated` + `RideStatusChanged` => call `gateway /internal/notify` => push WebSocket
- **Review Service**: `/reviews` (MongoDB)

---
Nếu bạn muốn “đúng 100% như hình” (tách thêm `booking-service`, `driver-service`, dùng Redis cache đúng nghĩa, hoặc đổi RabbitMQ -> Kafka) mình có thể nâng cấp tiếp trên nền MVP này.

### 4.1 Tool test WebSocket có sẵn
```bash
cd tools/ws-test
npm i
TOKEN=$TOKEN node ws-test.js
```
Giữ terminal đó mở, rồi bạn tạo ride / pay ride ở mục (3), bạn sẽ thấy event realtime in ra.
