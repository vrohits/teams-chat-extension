# Build stage
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/team-chat-backend-1.0.0.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-Xmx350m", "-XX:+UseSerialGC", "-jar", "app.jar"]
