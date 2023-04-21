@echo off
@rem %1 builderDir
@rem %2 projectCode
@rem %3 logFile
@rem %4 serverFolder
@rem %5 mainClassName
@rem %6 JDK
@rem %7... app arguments
@REM gradlew --console plain start %4 %5 %6 %7 %8 | node %1\coloredGradle.js %2 %3
if not "default" == "%6" echo "Set JAVA_HOME to %6"
if not "default" == "%6" SET JAVA_HOME=%6
if not "default" == "%6" SET PATH=%JAVA_HOME%/bin;%PATH%

java %7 %8 %9 "-Djava.net.preferIPv4Stack=true" -cp ./%4/build/libs/uuapp-classpath.jar %5 | node %1\coloredGradle.js %2 %3

title %2 END!!!

