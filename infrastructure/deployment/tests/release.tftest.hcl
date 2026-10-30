mock_provider "cloudflare" {}

variables {
  account_id  = "account"
  script_name = "riftkeeper-api"
}

run "stage" {
  variables {
    version_id      = "new"
    live_version_id = "live"
  }

  assert {
    condition = cloudflare_workers_deployment.this.versions == tolist([
      { version_id = "new", percentage = 0.01 },
      { version_id = "live", percentage = 99.99 },
    ])
    error_message = "Staging keeps the live version at 99.99% and gives the new one 0.01%."
  }
}

run "rollback_after_stage" {
  variables {
    version_id      = "new"
    live_version_id = "live"
    rollback        = true
  }

  assert {
    condition     = cloudflare_workers_deployment.this.versions == tolist([{ version_id = "live", percentage = 100 }])
    error_message = "A rollback after staging sends all traffic to the live version."
  }
}

run "stage_again" {
  variables {
    version_id      = "new"
    live_version_id = "live"
  }
}

run "promote" {
  variables {
    version_id = "new"
  }

  assert {
    condition     = cloudflare_workers_deployment.this.versions == tolist([{ version_id = "new", percentage = 100 }])
    error_message = "Promotion sends all traffic to the new version."
  }
}

run "rollback_after_promote" {
  variables {
    version_id      = "new"
    live_version_id = "live"
    rollback        = true
  }

  assert {
    condition     = cloudflare_workers_deployment.this.versions == tolist([{ version_id = "live", percentage = 100 }])
    error_message = "A rollback after promotion sends all traffic to the live version."
  }
}

run "unchanged_version" {
  variables {
    version_id      = "live"
    live_version_id = "live"
    rollback        = true
  }

  assert {
    condition     = cloudflare_workers_deployment.this.versions == tolist([{ version_id = "live", percentage = 100 }])
    error_message = "A Worker whose version did not change keeps it at 100%, in a rollback too."
  }
}

run "bootstrap" {
  variables {
    version_id = "new"
    rollback   = true
  }

  assert {
    condition     = cloudflare_workers_deployment.this.versions == tolist([{ version_id = "new", percentage = 100 }])
    error_message = "Without a live version there is nothing to stage next to or roll back to."
  }
}
