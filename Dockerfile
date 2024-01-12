# Використовуємо офіційний образ PostgreSQL як базу
FROM postgres:latest

# Встановлюємо змінні середовища для користувача, пароля та бази даних
ENV POSTGRES_USER smsuser
ENV POSTGRES_PASSWORD smsuser
ENV POSTGRES_DB sms

# Відкриваємо порт 5432 для доступу до бази даних
EXPOSE 5432

# Використовуємо Docker Volume для зберігання даних бази
VOLUME pgdata:/var/lib/postgresql/data