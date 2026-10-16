package utils

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type TokenClaims struct {
	UserID    uint   `json:"user_id"`
	Username  string `json:"username"`
	ExpiresAt int64  `json:"exp"`
}

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

func GenerateToken(userID uint, username string, secret string, duration time.Duration) (string, error) {
	if secret == "" {
		secret = "bisket-core-default-secret-key-2025"
	}
	claims := TokenClaims{
		UserID:    userID,
		Username:  username,
		ExpiresAt: time.Now().Add(duration).Unix(),
	}
	payloadBytes, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}
	encodedPayload := base64.RawURLEncoding.EncodeToString(payloadBytes)

	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(encodedPayload))
	signature := base64.RawURLEncoding.EncodeToString(h.Sum(nil))

	return fmt.Sprintf("%s.%s", encodedPayload, signature), nil
}

func ParseToken(tokenString string, secret string) (*TokenClaims, error) {
	if secret == "" {
		secret = "bisket-core-default-secret-key-2025"
	}
	parts := strings.Split(tokenString, ".")
	if len(parts) != 2 {
		return nil, errors.New("invalid token format")
	}

	payloadPart, sigPart := parts[0], parts[1]

	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(payloadPart))
	expectedSig := base64.RawURLEncoding.EncodeToString(h.Sum(nil))

	if !hmac.Equal([]byte(sigPart), []byte(expectedSig)) {
		return nil, errors.New("invalid token signature")
	}

	payloadBytes, err := base64.RawURLEncoding.DecodeString(payloadPart)
	if err != nil {
		return nil, errors.New("invalid token payload")
	}

	var claims TokenClaims
	if err := json.Unmarshal(payloadBytes, &claims); err != nil {
		return nil, errors.New("cannot parse token claims")
	}

	if time.Now().Unix() > claims.ExpiresAt {
		return nil, errors.New("token expired")
	}

	return &claims, nil
}
