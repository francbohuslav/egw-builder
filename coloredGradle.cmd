@echo off
@rem %1 builderDir
@rem %2 projectCode
@rem %3 logFile
@rem %4 mainClassName
@rem %5 JDK
@rem %6... app arguments
@REM gradlew --console plain start %4 %5 %6 %7 %8 | node %1\coloredGradle.js %2 %3
if not "default" == "%5" echo "Set JAVA_HOME to %5"
if not "default" == "%5" SET JAVA_HOME=%5
if not "default" == "%5" SET PATH=%JAVA_HOME%/bin;%PATH%

java %6 %7 %8 %9 "-Djava.net.preferIPv4Stack=true" -cp ./build/libs/uuapp-classpath.jar %4 | node %1\coloredGradle.js %2 %3

title %2 END!!!

