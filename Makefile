CC=clang
TARGET_EXEC ?= jeditrader

BUILD_DIR ?= ./build
SRC_DIR ?= ./jeditrader
LDFLAGS ?= -lglfw -lGL -lGLEW -lm -lpthread

SRCS := $(shell find $(SRC_DIR) -name *.c)
OBJS := $(SRCS:%=$(BUILD_DIR)/obj/%.o)
DEPS := $(OBJS:.o=.d)

CFLAGS += -std=c11 -MMD -MP -ffast-math

$(BUILD_DIR)/$(TARGET_EXEC): $(OBJS)
	$(CC) $(OBJS) -o $@ $(LDFLAGS)

$(BUILD_DIR)/obj/%.c.o: %.c
	$(MKDIR_P) $(dir $@)
	$(CC) $(CFLAGS) -c $< -o $@

.PHONY: clean
clean:
	$(RM) -r $(BUILD_DIR)

.PHONY: run
run: $(BUILD_DIR)/$(TARGET_EXEC)
	$(BUILD_DIR)/$(TARGET_EXEC) A B

-include $(DEPS)

MKDIR_P ?= mkdir -p
