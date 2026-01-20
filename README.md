# 🚕 Ride-hailing Microservices System  
## Nhập môn Dữ liệu lớn – CAB BOOKING SYSTEM

---

## 📌 Giới thiệu đề tài

Trong thời đại chuyển đổi số, các ứng dụng gọi xe công nghệ (*ride-hailing*) như **Grab**, **Uber**, **Gojek** đã trở thành một phần không thể thiếu trong đời sống hằng ngày.  
Những hệ thống này phải xử lý **khối lượng dữ liệu lớn**, **nhiều người dùng truy cập đồng thời**, đồng thời yêu cầu **tính realtime cao** và **khả năng mở rộng linh hoạt**.

Đề tài này xây dựng một **MVP (Minimum Viable Product)** cho hệ thống **Ride-hailing** dựa trên kiến trúc **Microservices + Message Broker**, nhằm minh họa một hệ thống dữ liệu lớn hiện đại.

---

## 🏗️ Kiến trúc tổng thể hệ thống

![Ride-hailing Microservices Architecture](docs/images/architecture.png)

**Hình trên mô tả kiến trúc tổng thể của hệ thống**, bao gồm:
- Client Layer (Admin / Customer / Driver)
- API Gateway
- Microservices Layer
- Data Layer
- Message Broker

---

## 🎯 Mục tiêu của đề tài

- 🔹 Áp dụng kiến trúc **Microservices**
- 🔹 Mô phỏng luồng xử lý **dữ liệu lớn**
- 🔹 Áp dụng **event-driven architecture**
- 🔹 Sử dụng **Kafka / RabbitMQ**
- 🔹 Hỗ trợ **realtime communication (WebSocket)**
- 🔹 Làm nền tảng cho các hướng mở rộng Big Data

---

## 🧩 Các thành phần chính

### 🔸 Client Layer
- Admin Dashboard (ReactJS)
- Customer App (ReactJS)
- Driver App (ReactJS)  
➡️ Giao tiếp qua **REST API** và **WebSocket**

---

### 🔸 API Gateway (NodeJS)
- Điểm truy cập duy nhất của hệ thống
- Xác thực JWT
- Định tuyến request
- Push realtime notification

---

### 🔸 Microservices Layer
- **Auth Service**: đăng ký, đăng nhập, JWT
- **User Service**: quản lý người dùng
- **Driver Service**: quản lý tài xế
- **Pricing Service**: ước tính giá
- **Booking Service**: tạo booking
- **Ride Service**: quản lý trạng thái chuyến đi
- **Payment Service**: thanh toán (giả lập)
- **Notification Service**: realtime notification
- **Review Service**: đánh giá chuyến đi

---

### 🔸 Data Layer
- 🐘 **PostgreSQL**: dữ liệu quan hệ
- 🍃 **MongoDB**: dữ liệu phi cấu trúc
- ⚡ **Redis**: cache, tối ưu hiệu năng

---

### 🔸 Message Broker
- **Kafka / RabbitMQ**
- Các event chính:
  - `RideCreated`
  - `PaymentSuccess`
  - `RideStatusChanged`

---

## 🔄 Luồng xử lý nghiệp vụ (MVP Flow)

1. Customer đăng ký / đăng nhập → nhận JWT  
2. Yêu cầu ước tính giá  
3. Tạo booking / ride  
4. Booking Service phát `RideCreated`  
5. Notification Service push realtime  
6. Customer thanh toán  
7. Payment Service phát `PaymentSuccess`  
8. Ride Service cập nhật trạng thái  
9. Notification Service push trạng thái mới  

➡️ Thể hiện rõ **event-driven & xử lý dữ liệu phân tán**

---

## 📊 Liên hệ với môn Nhập môn Dữ liệu lớn

- Dữ liệu phát sinh liên tục
- Xử lý phân tán
- Giao tiếp qua message queue
- Hỗ trợ realtime
- Dễ mở rộng theo chiều ngang

👉 Nền tảng cho:
- Kafka Streaming
- Data Analytics
- Machine Learning

---

## ✅ Kết luận

Hệ thống Ride-hailing Microservices MVP mô phỏng thành công một hệ thống gọi xe hiện đại, thể hiện rõ các đặc trưng của **hệ thống dữ liệu lớn** trong thực tế.

---

👨‍🎓 **Sinh viên thực hiện:** Tiến Võ  
📘 **Môn học:** Nhập môn Dữ liệu lớn  
📅 **Năm học:** 2025 – 2026
