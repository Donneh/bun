variable "account_id" {
  type        = string
  description = "Cloudflare account that owns the Worker."
}

variable "zone_id" {
  type        = string
  description = "Cloudflare zone that contains the API hostname."
}

variable "hostname" {
  type        = string
  description = "Public hostname for the API, for example api.riftkeeper.gg. It must belong to the zone."
}

variable "web_hostname" {
  type        = string
  description = "Public hostname for the web app, for example riftkeeper.gg. It must belong to the zone. www.<web_hostname> redirects to it."

  validation {
    condition     = can(regex("^[a-z0-9-]+(\\.[a-z0-9-]+)+$", var.web_hostname))
    error_message = "Set web_hostname (WEB_HOSTNAME in GitHub) to a hostname such as riftkeeper.app."
  }
}
