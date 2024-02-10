USE socketiostorage;

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  client_offset TEXT UNIQUE,
  content TEXT
);