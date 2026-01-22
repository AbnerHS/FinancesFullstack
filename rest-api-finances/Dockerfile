# Etapa 1: Build (usando Maven)
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
#COPY . .
#RUN mvn clean package -DskipTests

COPY pom.xml .
RUN mvn dependency:go-offline

COPY src ./src

EXPOSE 8080
EXPOSE 5005

CMD ["mvn", "spring-boot:run", "-Dspring-boot.run.jvmArguments=-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"]

# Etapa 2: Execução
#FROM eclipse-temurin:21-jre-alpine
#WORKDIR /app
# Copia o .jar gerado na etapa anterior
#COPY --from=build /app/target/*.jar app.jar
# Comando para rodar a aplicação
#ENTRYPOINT ["java", "-jar", "app.jar"]