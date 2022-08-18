CC=clang
GLSLC=glslc
TARGET_EXEC ?= jeditrader

BUILD_DIR ?= ./build
SRC_DIR ?= ./src
ASSET_DIR ?= ./assets
LDFLAGS ?= -lm -lSDL2 -lMoltenVK -Ldylib/macOS

SRCS := $(shell find $(SRC_DIR) -name *.c)
OBJS := $(SRCS:%=$(BUILD_DIR)/obj/%.o)
DEPS := $(OBJS:.o=.d)

SHADER_SRCS := $(shell find $(ASSET_DIR) -iname '*.frag' -or -iname '*.vert')
SHADER_OBJS := $(SHADER_SRCS:%=$(BUILD_DIR)/%.spv)

CFLAGS += -std=gnu11 -MMD -MP -ffast-math -g -I/Users/matthewcramerus/VulkanSDK/1.3.216.0/MoltenVK/include

$(BUILD_DIR)/$(TARGET_EXEC): $(OBJS) $(SHADER_OBJS)
	$(CC) -D DEBUG $(OBJS) -o $@ $(LDFLAGS)

$(BUILD_DIR)/obj/%.c.o: %.c
	$(MKDIR_P) $(dir $@)
	$(CC) $(CFLAGS) -c $< -o $@

$(BUILD_DIR)/$(ASSET_DIR)/%.spv: $(ASSET_DIR)/%
	$(MKDIR_P) $(dir $@)
	$(GLSLC) $< -o $@

.PHONY: clean
clean:
	$(RM) -r $(BUILD_DIR)

.PHONY: run
run: $(BUILD_DIR)/$(TARGET_EXEC)
	$(BUILD_DIR)/$(TARGET_EXEC) A B

-include $(DEPS)

MKDIR_P ?= mkdir -p
