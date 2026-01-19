# Microservices Authentication System

A complete microservices architecture with JWT authentication, service discovery, and API gateway.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Client/UI                            │
│                    (http://localhost:8080)                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│                    (Port: 8080)                              │
│  - Routes requests to microservices                          │
│  - Load balancing                                            │
│  - CORS handling                                             │
└───────────────┬──────────────────────┬──────────────────────┘
                │                      │
       ┌────────▼────────┐    ┌───────▼────────┐
       │  Auth Service   │    │  User Service  │
       │   (Port: 8081)  │    │  (Port: 8082)  │
       │                 │    │                │
       │ - Registration  │    │ - User Profile │
       │ - Login         │    │ - Protected    │
       │ - JWT Creation  │◄───┤   Endpoints    │
       │ - User Storage  │    │ - Feign Client │
       └─────────────────┘    └────────────────┘
                │                      │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │   Eureka Server      │
                │    (Port: 8761)      │
                │                      │
                │ - Service Discovery  │
                │ - Health Monitoring  │
                │ - Load Balancing     │
                └──────────────────────┘
```

## 📦 Microservices

### 1. **Eureka Server** (Port: 8761)
- **Purpose:** Service discovery and registration
- **Technology:** Spring Cloud Netflix Eureka
- **Features:**
  - Service registry
  - Health monitoring
  - Load balancing support
- **Dashboard:** http://localhost:8761

### 2. **Auth Service** (Port: 8081)
- **Purpose:** Authentication and user management
- **Technology:** Spring Boot, Spring Security, JWT, JPA
- **Features:**
  - User registration
  - User login
  - JWT token generation
  - Password encryption (BCrypt)
  - H2 database for user storage
- **Endpoints:**
  - `POST /api/auth/register` - Register new user
  - `POST /api/auth/login` - Login user
  - `GET /api/auth/internal/user/{email}` - Internal endpoint for user-service

### 3. **User Service** (Port: 8082)
- **Purpose:** User profile and protected operations
- **Technology:** Spring Boot, Spring Security, JWT, Feign Client
- **Features:**
  - JWT token validation
  - User profile retrieval
  - Inter-service communication with auth-service
- **Endpoints:**
  - `GET /api/user/profile` - Get user profile (protected)
  - `GET /api/user/test` - Test protected endpoint

### 4. **API Gateway** (Port: 8080)
- **Purpose:** Single entry point for all client requests
- **Technology:** Spring Cloud Gateway
- **Features:**
  - Request routing
  - Load balancing
  - CORS handling
  - Service discovery integration
  - Static UI serving
- **Routes:**
  - `/api/auth/**` → auth-service
  - `/api/user/**` → user-service
  - `/` → Static UI

## 🚀 How to Run

### Prerequisites
- Java 17 or higher
- Maven 3.6+

### Option 1: Run All Services Manually

**Step 1: Start Eureka Server**
```bash
cd microservices/eureka-server
mvn spring-boot:run
```
Wait for Eureka to start (check http://localhost:8761)

**Step 2: Start Auth Service**
```bash
cd microservices/auth-service
mvn spring-boot:run
```
Wait for registration with Eureka

**Step 3: Start User Service**
```bash
cd microservices/user-service
mvn spring-boot:run
```
Wait for registration with Eureka

**Step 4: Start API Gateway**
```bash
cd microservices/api-gateway
mvn spring-boot:run
```

**Step 5: Access the Application**
```
http://localhost:8080
```

### Option 2: Run with Script (Coming Soon)

### Startup Order (Important!)
1. **Eureka Server** (8761) - Must start first
2. **Auth Service** (8081) - Registers with Eureka
3. **User Service** (8082) - Registers with Eureka
4. **API Gateway** (8080) - Discovers services from Eureka

## 🔗 Service Communication

### Client → API Gateway → Services
```
Client Request
    ↓
API Gateway (8080)
    ↓
Routes to appropriate service
    ↓
Auth Service (8081) OR User Service (8082)
```

### Inter-Service Communication (Feign)
```
User Service → Feign Client → Auth Service
```

Example: When getting user profile, user-service calls auth-service internally to fetch user details.

## 📡 API Endpoints

### Public Endpoints (via API Gateway)

#### Register User
```bash
POST http://localhost:8080/api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login
```bash
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Protected Endpoints (Require JWT Token)

#### Get User Profile
```bash
GET http://localhost:8080/api/user/profile
Authorization: Bearer <your-jwt-token>
```

#### Test Protected Endpoint
```bash
GET http://localhost:8080/api/user/test
Authorization: Bearer <your-jwt-token>
```

## 🎨 UI Integration

The UI is served by the API Gateway at `http://localhost:8080`

- **Login/Register:** Beautiful modern interface
- **JWT Storage:** Automatic token management
- **Protected Routes:** Dashboard after login
- **Logout:** Secure token removal

## 🔐 Security Features

- ✅ **JWT Authentication** - Stateless authentication
- ✅ **Password Encryption** - BCrypt hashing
- ✅ **Token Validation** - Each service validates JWT
- ✅ **CORS Enabled** - Cross-origin support
- ✅ **Service-to-Service Auth** - Internal endpoints
- ✅ **Centralized Security** - Gateway-level security (future)

## 📊 Monitoring

### Eureka Dashboard
```
http://localhost:8761
```
View all registered services, health status, and instances.

### H2 Console (Auth Service)
```
http://localhost:8081/h2-console
```
- JDBC URL: `jdbc:h2:mem:authdb`
- Username: `sa`
- Password: (empty)

## 🔧 Configuration

### Service Ports
- **Eureka Server:** 8761
- **Auth Service:** 8081
- **User Service:** 8082
- **API Gateway:** 8080

### JWT Configuration
All services share the same JWT secret for token validation:
```properties
jwt.secret=5367566B59703373367639792F423F4528482B4D6251655468576D5A71347437
jwt.expiration=86400000  # 24 hours
```

### Database
- **Auth Service:** H2 in-memory database
- **User Service:** No database (calls auth-service via Feign)

## 🌟 Key Features

### 1. Service Discovery
- Automatic service registration
- Dynamic service lookup
- Health monitoring
- No hardcoded URLs

### 2. Load Balancing
- Client-side load balancing via Ribbon
- Multiple instances support
- Automatic failover

### 3. API Gateway
- Single entry point
- Request routing
- CORS handling
- Future: Rate limiting, authentication

### 4. Inter-Service Communication
- Feign Client for REST calls
- Service discovery integration
- Declarative REST client

## 📁 Project Structure

```
microservices/
├── eureka-server/          # Service discovery
│   ├── src/
│   └── pom.xml
├── auth-service/           # Authentication service
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   │   └── com/example/microservices/auth/
│   │   │   │       ├── config/
│   │   │   │       ├── controller/
│   │   │   │       ├── dto/
│   │   │   │       ├── model/
│   │   │   │       ├── repository/
│   │   │   │       ├── security/
│   │   │   │       └── service/
│   │   │   └── resources/
│   │   │       └── application.properties
│   └── pom.xml
├── user-service/           # User management service
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   │   └── com/example/microservices/user/
│   │   │   │       ├── client/         # Feign clients
│   │   │   │       ├── config/
│   │   │   │       ├── controller/
│   │   │   │       ├── model/
│   │   │   │       └── security/
│   │   │   └── resources/
│   │   │       └── application.properties
│   └── pom.xml
└── api-gateway/            # API Gateway
    ├── src/
    │   ├── main/
    │   │   ├── java/
    │   │   │   └── com/example/microservices/gateway/
    │   │   └── resources/
    │   │       ├── static/         # UI files
    │   │       └── application.properties
    └── pom.xml
```

## 🧪 Testing the Microservices

### 1. Test Service Discovery
Visit Eureka dashboard: http://localhost:8761
You should see all services registered.

### 2. Test Registration
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### 3. Test Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 4. Test Protected Endpoint
```bash
curl -X GET http://localhost:8080/api/user/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🚧 Future Enhancements

### Planned Features
- [ ] **Config Server** - Centralized configuration
- [ ] **Distributed Tracing** - Sleuth + Zipkin
- [ ] **Circuit Breaker** - Resilience4j
- [ ] **API Rate Limiting** - Gateway filters
- [ ] **Centralized Logging** - ELK Stack
- [ ] **Database per Service** - PostgreSQL for each service
- [ ] **Message Queue** - RabbitMQ/Kafka for async communication
- [ ] **Docker Compose** - Containerization
- [ ] **Kubernetes** - Orchestration
- [ ] **OAuth2** - Social login
- [ ] **Refresh Tokens** - Token rotation
- [ ] **Admin Service** - User management
- [ ] **Notification Service** - Email/SMS
- [ ] **File Service** - File upload/download

### Scalability
- Run multiple instances of each service
- Load balancer will distribute requests
- Eureka handles service discovery automatically

## 🐛 Troubleshooting

### Services not registering with Eureka
- Ensure Eureka Server is running first
- Check `eureka.client.service-url.defaultZone` in application.properties
- Wait 30 seconds for registration

### Gateway not routing requests
- Check Eureka dashboard - all services should be UP
- Verify route configuration in gateway's application.properties
- Check service names match exactly

### JWT token not working
- Ensure all services use the same JWT secret
- Check token format: `Bearer <token>`
- Verify token hasn't expired (24 hours)

### Feign client errors
- Ensure auth-service is running and registered
- Check service name in @FeignClient annotation
- Verify internal endpoint is accessible

## 📚 Technologies Used

- **Spring Boot 3.2.0** - Framework
- **Spring Cloud 2023.0.0** - Microservices
- **Spring Cloud Netflix Eureka** - Service discovery
- **Spring Cloud Gateway** - API Gateway
- **Spring Cloud OpenFeign** - Inter-service communication
- **Spring Security** - Authentication & Authorization
- **JWT (JJWT 0.12.3)** - Token-based auth
- **Spring Data JPA** - Data access
- **H2 Database** - In-memory database
- **Lombok** - Boilerplate reduction
- **Maven** - Build tool

## 🎓 Learning Resources

- [Spring Cloud Documentation](https://spring.io/projects/spring-cloud)
- [Microservices Patterns](https://microservices.io/patterns/)
- [JWT Introduction](https://jwt.io/introduction)
- [Eureka Documentation](https://cloud.spring.io/spring-cloud-netflix/reference/html/)

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Verify all services are running
3. Check Eureka dashboard for service health
4. Review application logs

---

**Built with ❤️ using Spring Cloud Microservices Architecture**
