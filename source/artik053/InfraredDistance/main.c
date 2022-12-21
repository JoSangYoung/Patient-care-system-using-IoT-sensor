/****************************************************************************
 * 수위센서로 부터 수위 데이터 읽고
 * 아틱 클라우드로 데이터 전송까지 확인
 ****************************************************************************/

#include "wifi.h"
#include <tinyara/gpio.h>
#include <apps/netutils/mqtt_api.h>
#include <apps/netutils/dhcpc.h>
#include <time.h>
#include <apps/shell/tash.h>

#include <tinyara/analog/adc.h>
#include <tinyara/analog/ioctl.h>

#define DEFAULT_CLIENT_ID "SEUNGMIN"
#define SERVER_ADDR "api.artik.cloud"
#define NET_DEVNAME "wl1"
#define MAX_TIME_STRING 80

#define DEVICE_ID "58a51625ccd5468280f7ab12950aea81"
#define DEVICE_TOKEN "6e261fc8dd4040008812c06493dd466d"
#define ARTIK_MAC "286D974011BE"

// 아틱 클라우드 CA 인증서
static const char mqtt_ca_crt_rsa[] =
		"-----BEGIN CERTIFICATE-----\r\n"
		"MIIFODCCBCCgAwIBAgIQUT+5dDhwtzRAQY0wkwaZ/zANBgkqhkiG9w0BAQsFADCB\r\n"
		"yjELMAkGA1UEBhMCVVMxFzAVBgNVBAoTDlZlcmlTaWduLCBJbmMuMR8wHQYDVQQL\r\n"
		"ExZWZXJpU2lnbiBUcnVzdCBOZXR3b3JrMTowOAYDVQQLEzEoYykgMjAwNiBWZXJp\r\n"
		"U2lnbiwgSW5jLiAtIEZvciBhdXRob3JpemVkIHVzZSBvbmx5MUUwQwYDVQQDEzxW\r\n"
		"ZXJpU2lnbiBDbGFzcyAzIFB1YmxpYyBQcmltYXJ5IENlcnRpZmljYXRpb24gQXV0\r\n"
		"aG9yaXR5IC0gRzUwHhcNMTMxMDMxMDAwMDAwWhcNMjMxMDMwMjM1OTU5WjB+MQsw\r\n"
		"CQYDVQQGEwJVUzEdMBsGA1UEChMUU3ltYW50ZWMgQ29ycG9yYXRpb24xHzAdBgNV\r\n"
		"BAsTFlN5bWFudGVjIFRydXN0IE5ldHdvcmsxLzAtBgNVBAMTJlN5bWFudGVjIENs\r\n"
		"YXNzIDMgU2VjdXJlIFNlcnZlciBDQSAtIEc0MIIBIjANBgkqhkiG9w0BAQEFAAOC\r\n"
		"AQ8AMIIBCgKCAQEAstgFyhx0LbUXVjnFSlIJluhL2AzxaJ+aQihiw6UwU35VEYJb\r\n"
		"A3oNL+F5BMm0lncZgQGUWfm893qZJ4Itt4PdWid/sgN6nFMl6UgfRk/InSn4vnlW\r\n"
		"9vf92Tpo2otLgjNBEsPIPMzWlnqEIRoiBAMnF4scaGGTDw5RgDMdtLXO637QYqzu\r\n"
		"s3sBdO9pNevK1T2p7peYyo2qRA4lmUoVlqTObQJUHypqJuIGOmNIrLRM0XWTUP8T\r\n"
		"L9ba4cYY9Z/JJV3zADreJk20KQnNDz0jbxZKgRb78oMQw7jW2FUyPfG9D72MUpVK\r\n"
		"Fpd6UiFjdS8W+cRmvvW1Cdj/JwDNRHxvSz+w9wIDAQABo4IBYzCCAV8wEgYDVR0T\r\n"
		"AQH/BAgwBgEB/wIBADAwBgNVHR8EKTAnMCWgI6Ahhh9odHRwOi8vczEuc3ltY2Iu\r\n"
		"Y29tL3BjYTMtZzUuY3JsMA4GA1UdDwEB/wQEAwIBBjAvBggrBgEFBQcBAQQjMCEw\r\n"
		"HwYIKwYBBQUHMAGGE2h0dHA6Ly9zMi5zeW1jYi5jb20wawYDVR0gBGQwYjBgBgpg\r\n"
		"hkgBhvhFAQc2MFIwJgYIKwYBBQUHAgEWGmh0dHA6Ly93d3cuc3ltYXV0aC5jb20v\r\n"
		"Y3BzMCgGCCsGAQUFBwICMBwaGmh0dHA6Ly93d3cuc3ltYXV0aC5jb20vcnBhMCkG\r\n"
		"A1UdEQQiMCCkHjAcMRowGAYDVQQDExFTeW1hbnRlY1BLSS0xLTUzNDAdBgNVHQ4E\r\n"
		"FgQUX2DPYZBV34RDFIpgKrL1evRDGO8wHwYDVR0jBBgwFoAUf9Nlp8Ld7LvwMAnz\r\n"
		"Qzn6Aq8zMTMwDQYJKoZIhvcNAQELBQADggEBAF6UVkndji1l9cE2UbYD49qecxny\r\n"
		"H1mrWH5sJgUs+oHXXCMXIiw3k/eG7IXmsKP9H+IyqEVv4dn7ua/ScKAyQmW/hP4W\r\n"
		"Ko8/xabWo5N9Q+l0IZE1KPRj6S7t9/Vcf0uatSDpCr3gRRAMFJSaXaXjS5HoJJtG\r\n"
		"QGX0InLNmfiIEfXzf+YzguaoxX7+0AjiJVgIcWjmzaLmFN5OUiQt/eV5E1PnXi8t\r\n"
		"TRttQBVSK/eHiXgSgW7ZTaoteNTCLD0IX4eRnh8OsN4wUmSGiaqdZpwOdgyA8nTY\r\n"
		"Kvi4Os7X1g8RvmurFPW9QaAiY4nxug9vKWNmLT+sjHLF+8fk1A/yO0+MKcc=\r\n"
		"-----END CERTIFICATE-----\r\n";

// mqtt client handle
mqtt_client_t* pClientHandle = NULL;

// mqtt client parameters
mqtt_client_config_t clientConfig;

mqtt_tls_param_t tls;

// MQTT 콜백
void onConnect(void* client, int result) {
    printf("info)Connected to artik cloud server.\n");
}
void onDisconnect(void* client, int result) {
    printf("info)Disconnected to artik cloud server.%d\n", result);
}
void onPublish(void* client, int result) {
	printf("info)Message published.\n");
}

const unsigned char *mqtt_get_ca_certificate(void)
{
	return (const unsigned char *)mqtt_ca_crt_rsa;
}

// TLS 보안 세팅
void setTlsConfig(void){
	tls.ca_cert = mqtt_get_ca_certificate();
	tls.ca_cert_len = sizeof(mqtt_ca_crt_rsa);
	tls.cert = NULL;
	tls.cert_len = 0;
	tls.key = NULL;
	tls.key_len = 0;
}

// MQTT 연결 설정 세팅
void initializeConfigUtil(void) {
    uint8_t macId[IFHWADDRLEN];
    int result = netlib_getmacaddr("wl1", macId);

	setTlsConfig();

	clientConfig.client_id = ARTIK_MAC; // MAC id Artik 053
	clientConfig.user_name = DEVICE_ID;
	clientConfig.password = DEVICE_TOKEN;
	clientConfig.tls = &tls;

	printf("info)Registering mqtt client with id = %s.\n", ARTIK_MAC);
	printf("info)Client configuration set.\n   DEVICE_ID : %s\n   DEVICE_TOKEN : %s\n", clientConfig.user_name, clientConfig.password);

    clientConfig.on_connect = (void*) onConnect;
    clientConfig.on_disconnect = (void*) onDisconnect;
    clientConfig.on_publish = (void*) onPublish;
}

// 아틱 시간 설정
void setCurrentTime(int year, int month, int day, int hour, int min, int sec){
	struct timespec ts;
	struct tm tm;
	int ret = OK;

	tm.tm_mon = month-1;
	tm.tm_mday = day;
	tm.tm_hour = hour-1;
	tm.tm_min = min-1;
	tm.tm_sec = sec;
	tm.tm_year = year-1900;

	ts.tv_sec = mktime(&tm);
	ts.tv_nsec = 0;

	ret = clock_settime(CLOCK_REALTIME, &ts);
	if (ret < 0) {
		printf("error) time setting failed.\n");
	}
}

// 아틱 현재 로컬 시간 확인
static int date_showtime(void)
{
	static const char format[] = "%b %d %H:%M:%S %Y";
	struct timespec ts;
	struct tm tm;
	char timbuf[MAX_TIME_STRING];
	int ret;

	/* Get the current time */

	ret = clock_gettime(CLOCK_REALTIME, &ts);
	if (ret < 0) {
		printf("clock_gettime failed\n");

		return ERROR;
	}

	/* Break the current time up into the format needed by strftime */

	(void)gmtime_r((FAR const time_t *)&ts.tv_sec, &tm);

	/* Show the current time in the requested format */

	(void)strftime(timbuf, MAX_TIME_STRING, format, &tm);
	printf("%s\n", timbuf);

	return OK;
}

int main(int argc, char *argv[]) {
    bool wifiConnected = false;
    char mqttData[50];
    char mqttTopic[50];
    int mqttDataLen;

    // 아틱 시간 설정
    setCurrentTime(2017, 9, 1, 22, 7, 0);
	date_showtime();

#ifdef CONFIG_CTRL_IFACE_FIFO
    int ret;

    while(!wifiConnected) {
        ret = mkfifo(CONFIG_WPA_CTRL_FIFO_DEV_REQ,
                CONFIG_WPA_CTRL_FIFO_MK_MODE);
        if (ret != 0 && ret != -EEXIST) {
            printf("mkfifo error for %s: %s",
                    CONFIG_WPA_CTRL_FIFO_DEV_REQ,
                    strerror(errno));
        }
        ret = mkfifo(CONFIG_WPA_CTRL_FIFO_DEV_CFM,
                CONFIG_WPA_CTRL_FIFO_MK_MODE);
        if (ret != 0 && ret != -EEXIST) {
            printf("mkfifo error for %s: %s",
                    CONFIG_WPA_CTRL_FIFO_DEV_CFM,
                    strerror(errno));
        }

        ret = mkfifo(CONFIG_WPA_MONITOR_FIFO_DEV,
                CONFIG_WPA_CTRL_FIFO_MK_MODE);
        if (ret != 0 && ret != -EEXIST) {
            printf("mkfifo error for %s: %s",
                    CONFIG_WPA_MONITOR_FIFO_DEV,
                    strerror(errno));
        }
    #endif

        if (start_wifi_interface() == SLSI_STATUS_ERROR) {
            printf("error)Wifi connection failed. Check SSID and PSK.\n");
        }
        else {
            wifiConnected = true;
        }
    }

    printf("info)Wifi connected.\n");

    bool mqttConnected = false;
    bool ipObtained = false;

    struct dhcpc_state state;
    void *dhcp_handle;

    while(!ipObtained) {
        dhcp_handle = dhcpc_open(NET_DEVNAME);
        ret = dhcpc_request(dhcp_handle, &state);
        dhcpc_close(dhcp_handle);

        if (ret != OK) {
            printf("error)Failed to get IP address.\n");
            sleep(1);
        }
        else {
            ipObtained = true;
        }
    }
    netlib_set_ipv4addr(NET_DEVNAME, &state.ipaddr);
    netlib_set_ipv4netmask(NET_DEVNAME, &state.netmask);
    netlib_set_dripv4addr(NET_DEVNAME, &state.default_router);

    printf("info)IP address is %s\n", inet_ntoa(state.ipaddr));

    sleep(5);

    // MQTT 연결 설정 세팅
    initializeConfigUtil();

    pClientHandle = mqtt_init_client(&clientConfig);
    if (pClientHandle == NULL) {
    	printf("error)MQTT client handle initialization failed.\n");
        return 0;
    }

    while (mqttConnected == false ) {
        sleep(2);
        // Connect mqtt client to server
        int result = mqtt_connect(pClientHandle, SERVER_ADDR, 8883, 60);
        if (result < 0) {
            printf("error)MQTT client connection failed.\n");
            continue;
        }

        mqttConnected = true;
        printf("info)MQTT client connected to server.\n");
    }

    // Read analog signal using ADC
	int fd;
	struct adc_msg_s sample;
	size_t readsize;

	fd = open("/dev/adc0", O_RDONLY);

    if (fd < 0) {
        printf("error)Device open failed.\n");
        return 0;
    }

    while(1) {
    	ioctl(fd, ANIOC_TRIGGER, 0);

		readsize = sizeof(struct adc_msg_s);

		read(fd, &sample, readsize);

		if(sample.am_channel == 0){
			mqttDataLen = snprintf(mqttData, sizeof(mqttData), "{\"wasteBasket\":%d}", sample.am_data);
			snprintf(mqttTopic, sizeof(mqttTopic), "/v1.1/messages/%s", DEVICE_ID);

			mqtt_msg_t message;
			message.payload = mqttData;
			message.payload_len = mqttDataLen;
			message.topic = mqttTopic;
			message.qos = 0;
			message.retain = false;

			ret = mqtt_publish(pClientHandle, message.topic, (char*)message.payload, message.payload_len, message.qos, message.retain);
			if (ret < 0) {
				printf("error)MQTT message couldn't sent.\n");
			}

			printf("data: %s\n", mqttData);
		}

		// sleep for 10sec
		//sleep(5);
		usleep(5000000);
	}

    close(fd);
}
