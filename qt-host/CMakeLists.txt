# @file CMakeLists.txt
# @description Qt 壳工程构建脚本，负责构建 QtWebEngine + QWebChannel 桥接应用。
# @author Codex
# @date 2026-02-27
cmake_minimum_required(VERSION 3.21)

project(sam_ug_qt_host LANGUAGES CXX)

enable_testing()

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

find_package(Qt6 6.5 REQUIRED COMPONENTS Widgets WebEngineWidgets WebChannel Network)

qt_standard_project_setup()

# -----------------------------
# 前端构建配置（Vue3）
# -----------------------------
# 说明：
# 1. 每次构建 Qt 目标前自动执行 web-app 的构建。
# 2. 构建完成后将 dist 复制到可执行文件目录下的 web-dist，用于本地调试与打包。
set(WEB_APP_DIR "${CMAKE_CURRENT_LIST_DIR}/../web-app")
set(WEB_DIST_DIR "${WEB_APP_DIR}/dist")

add_custom_target(web_app_build
  COMMAND "${CMAKE_COMMAND}" -E rm -rf "${WEB_DIST_DIR}"
  COMMAND npm run build
  WORKING_DIRECTORY "${WEB_APP_DIR}"
  COMMENT "强制重建 web-app 前端产物（每次构建都会执行）"
  VERBATIM
)

add_custom_target(web_app_sync
  COMMAND "${CMAKE_COMMAND}" -E rm -rf "${CMAKE_CURRENT_BINARY_DIR}/web-dist"
  COMMAND "${CMAKE_COMMAND}" -E copy_directory "${WEB_DIST_DIR}" "${CMAKE_CURRENT_BINARY_DIR}/web-dist"
  DEPENDS web_app_build
  COMMENT "同步前端 dist 到 Qt 构建目录（每次构建都会执行）"
  VERBATIM
)

qt_add_executable(sam_ug_qt_host
  src/main.cpp
  src/bridge.h
  src/bridge.cpp
  src/compiler_account_normalizer.h
  src/compiler_account_normalizer.cpp
  resources.qrc
)

add_dependencies(sam_ug_qt_host web_app_sync)

set_target_properties(sam_ug_qt_host PROPERTIES
  WIN32_EXECUTABLE TRUE
)

target_link_libraries(sam_ug_qt_host
  PRIVATE
    Qt6::Widgets
    Qt6::WebEngineWidgets
    Qt6::WebChannel
    Qt6::Network
)

add_executable(compiler_account_normalizer_test
  tests/compiler_account_normalizer_test.cpp
  src/compiler_account_normalizer.h
  src/compiler_account_normalizer.cpp
)

target_include_directories(compiler_account_normalizer_test
  PRIVATE
    "${CMAKE_CURRENT_LIST_DIR}/src"
)

target_link_libraries(compiler_account_normalizer_test
  PRIVATE
    Qt6::Core
)

add_test(
  NAME compiler_account_normalizer_test
  COMMAND compiler_account_normalizer_test
)

add_executable(bridge_default_username_test
  tests/bridge_default_username_test.cpp
  src/bridge.h
  src/bridge.cpp
)

target_include_directories(bridge_default_username_test
  PRIVATE
    "${CMAKE_CURRENT_LIST_DIR}/src"
)

target_link_libraries(bridge_default_username_test
  PRIVATE
    Qt6::Core
    Qt6::Network
)

add_test(
  NAME bridge_default_username_test
  COMMAND bridge_default_username_test
)

add_executable(api_log_bridge_test
  tests/api_log_bridge_test.cpp
  src/bridge.h
  src/bridge.cpp
)

target_include_directories(api_log_bridge_test
  PRIVATE
    "${CMAKE_CURRENT_LIST_DIR}/src"
)

target_link_libraries(api_log_bridge_test
  PRIVATE
    Qt6::Core
    Qt6::Network
)

add_test(
  NAME api_log_bridge_test
  COMMAND api_log_bridge_test
)
