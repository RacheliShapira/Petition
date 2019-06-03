DROP TABLE IF EXISTS user_profiles;

CREATE TABLE user_profiles(
id SERIAL PRIMARY KEY,
age INT,
city VARCHAR(200),
url VARCHAR(400),
user_id INT REFERENCES users(id) NOT NULL UNIQUE
);
