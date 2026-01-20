# Giới thiệu đề tài – Nhập môn Dữ liệu lớn  
## Ride-hailing Microservices System (CAB BOOKING SYSTEM)

---

## 1. Giới thiệu chung

Trong thời đại chuyển đổi số, các ứng dụng gọi xe công nghệ (ride-hailing) như Grab, Uber hay Gojek đã trở thành một phần không thể thiếu trong đời sống hằng ngày. Những hệ thống này phải xử lý **khối lượng dữ liệu lớn**, **nhiều người dùng truy cập đồng thời**, đồng thời yêu cầu **tính realtime cao** và **khả năng mở rộng linh hoạt**.

Xuất phát từ thực tế đó, đề tài này xây dựng một **MVP (Minimum Viable Product)** cho hệ thống **Ride-hailing** dựa trên kiến trúc **Microservices kết hợp Message Broker**, nhằm minh họa cách một hệ thống dữ liệu lớn hiện đại được thiết kế và vận hành.

---

## 2. Mục tiêu của đề tài

- Tìm hiểu và áp dụng kiến trúc **Microservices**
- Mô phỏng luồng xử lý dữ liệu lớn trong hệ thống gọi xe
- Áp dụng **event-driven architecture**
- Sử dụng **Message Broker (Kafka / RabbitMQ)** để xử lý bất đồng bộ
- Hỗ trợ **realtime communication** thông qua WebSocket
- Làm nền tảng cho các hướng mở rộng Big Data nâng cao

---

## 3. Kiến trúc tổng thể hệ thống

Hệ thống được chia thành các tầng chính như sau:

---

## 3.1 Client Layer

Tầng Client bao gồm:

- **Admin Dashboard (ReactJS)**
- **Customer App (ReactJS)**
- **Driver App (ReactJS)**

Các client giao tiếp với hệ thống thông qua:
- **REST API (HTTPS)**
- **WebSocket** để nhận dữ liệu realtime (trạng thái chuyến đi, thông báo)

Trong phạm vi MVP, client chưa được xây dựng giao diện hoàn chỉnh mà sử dụng **Postman / curl** để kiểm thử API.

---

## 3.2 API Gateway

API Gateway được xây dựng bằng **NodeJS**, đóng vai trò là **điểm truy cập duy nhất** của toàn hệ thống.

Chức năng chính:
- Nhận request từ client
- Xác thực và kiểm tra **JWT**
- Định tuyến request đến các microservices tương ứng
- Nhận dữ liệu từ Notification Service và push realtime tới client qua WebSocket

---

## 3.3 Microservices Layer

Hệ thống được chia thành nhiều service độc lập, mỗi service đảm nhiệm một chức năng riêng biệt:

- **Auth Service**
  - Đăng ký và đăng nhập người dùng
  - Sinh và xác thực JWT

- **User Service**
  - Quản lý thông tin người dùng

- **Driver Service**
  - Quản lý thông tin tài xế
  - Cập nhật trạng thái hoạt động của tài xế

- **Pricing Service**
  - Tính toán và ước tính giá chuyến đi dựa trên khoảng cách

- **Booking Service**
  - Tiếp nhận yêu cầu đặt xe
  - Tạo booking ban đầu

- **Ride Service**
  - Quản lý trạng thái chuyến đi
  - Cập nhật trạng thái sau khi thanh toán hoặc có sự thay đổi

- **Payment Service**
  - Xử lý thanh toán (giả lập trong MVP)
  - Phát sự kiện thanh toán thành công

- **Notification Service**
  - Lắng nghe các sự kiện từ Message Broker
  - Gửi thông báo realtime về client

- **Review Service**
  - Lưu trữ và quản lý đánh giá chuyến đi

---

## 3.4 Data Layer

Hệ thống sử dụng nhiều loại cơ sở dữ liệu khác nhau để phù hợp với từng loại dữ liệu:

- **PostgreSQL**
  - Lưu trữ dữ liệu quan hệ như user, driver, ride, payment

- **MongoDB**
  - Lưu trữ dữ liệu phi cấu trúc như review

- **Redis**
  - Cache dữ liệu tạm thời
  - Hỗ trợ tối ưu hiệu năng và mở rộng trong tương lai

Việc sử dụng nhiều loại cơ sở dữ liệu giúp hệ thống linh hoạt và phù hợp với mô hình dữ liệu lớn (Polyglot Persistence).

---

## 3.5 Message Broker

Hệ thống sử dụng **Kafka hoặc RabbitMQ** làm Message Broker.

Chức năng:
- Truyền sự kiện giữa các microservices
- Giảm sự phụ thuộc trực tiếp giữa các service
- Hỗ trợ xử lý bất đồng bộ

Một số sự kiện chính:
- `RideCreated`
- `PaymentSuccess`
- `RideStatusChanged`

---

## 4. Luồng xử lý nghiệp vụ chính

Luồng xử lý MVP của hệ thống như sau:

1. Customer đăng ký / đăng nhập và nhận JWT
2. Customer yêu cầu ước tính giá chuyến đi
3. Customer tạo booking / ride
   - Booking Service xử lý và phát sự kiện `RideCreated`
4. Notification Service nhận sự kiện và gửi thông báo realtime
5. Customer thực hiện thanh toán
   - Payment Service phát sự kiện `PaymentSuccess`
6. Ride Service lắng nghe `PaymentSuccess`
   - Cập nhật trạng thái ride
   - Phát sự kiện `RideStatusChanged`
7. Notification Service tiếp tục push trạng thái mới về client

Luồng này thể hiện rõ kiến trúc **event-driven** và **xử lý dữ liệu phân tán**.

---

## 5. Liên hệ với môn Nhập môn Dữ liệu lớn

Mặc dù hệ thống mới ở mức MVP, nhưng đã thể hiện rõ các đặc trưng của một hệ thống dữ liệu lớn:

- Dữ liệu phát sinh liên tục từ nhiều nguồn
- Xử lý phân tán trên nhiều service
- Giao tiếp thông qua message queue
- Khả năng mở rộng theo chiều ngang
- Hỗ trợ xử lý realtime

Đây là nền tảng để phát triển thêm các bài toán Big Data như:
- Streaming với Kafka
- Phân tích dữ liệu hành vi người dùng
- Machine Learning cho gợi ý giá và điều phối tài xế

---

## 6. Kết luận

Đề tài Ride-hailing Microservices System đã mô phỏng thành công một hệ thống gọi xe hiện đại dựa trên kiến trúc Microservices và Message Broker.  
Thông qua đề tài này, sinh viên có cái nhìn tổng quan về cách xây dựng và vận hành một hệ thống dữ liệu lớn trong thực tế.

---

**Sinh viên thực hiện:** Tiến Võ  
**Môn học:** Nhập môn Dữ liệu lớn  
**Năm học:** 2025 – 2026
