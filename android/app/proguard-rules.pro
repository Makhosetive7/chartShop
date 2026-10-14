# kotlinx.serialization and Retrofit ship consumer rules; keep API DTOs readable in crash reports.
-keepattributes *Annotation*, InnerClasses, Signature, Exceptions
-keep,includedescriptorclasses class com.chartshop.app.data.model.**$$serializer { *; }
-keepclassmembers class com.chartshop.app.data.model.** {
    *** Companion;
}
