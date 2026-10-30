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

variable "live_versions" {
  type        = map(string)
  default     = {}
  description = "The version that serves traffic now, by Worker name. A Worker listed here keeps that version at 99.99% and gets its new version at 0.01%. A Worker missing from it moves all traffic to its new version."
}

variable "rollback" {
  type        = bool
  default     = false
  description = "Send all traffic of each Worker listed in live_versions back to that version, and none to the new one."
}

variable "github_dispatch_token" {
  type        = string
  sensitive   = true
  description = "A fine-grained GitHub token with Actions read and write on the repository. The scheduler Worker uses it to dispatch the scheduled workflows."

  validation {
    condition     = length(trimspace(var.github_dispatch_token)) > 0
    error_message = "Set github_dispatch_token (the WORKFLOW_DISPATCH_TOKEN secret in GitHub) to a GitHub token with Actions read and write."
  }
}
