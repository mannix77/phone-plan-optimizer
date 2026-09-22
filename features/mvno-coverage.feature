Feature: MVNO coverage
  The comparison covers the major MVNOs and prepaid brands, not just the
  big three's own prepaid arms.

  Background:
    Given 1 line with no new devices
    And MVNOs are included

  Scenario: US Mobile's unlimited starter is priced
    When the scenarios are computed
    Then the "US Mobile Unlimited Starter" rows have a 24-month plan cost of 600.00

  Scenario: Straight Talk's Silver unlimited is priced
    When the scenarios are computed
    Then the "Straight Talk Silver Unlimited" rows have a 24-month plan cost of 1080.00

  Scenario: Tello rides T-Mobile's MVNO priority tier
    When the scenarios are computed
    Then the "Tello Tello Unlimited" rows carry QCI 7

  Scenario: Visible's upper tiers are priced with taxes included
    When the scenarios are computed
    Then the "Visible Visible+" rows have a 24-month plan cost of 840.00
    And the "Visible Visible+ Pro" rows have a 24-month plan cost of 1080.00

  Scenario: Visible's upper tiers carry premium data for the needs assessment
    Given the user needs "maximum" data, 0 GB of hotspot, and no international use
    When the scenarios are computed
    Then the "Visible Visible Unlimited" plan is excluded by needs
    And the "Visible Visible+" plan is included
    And the "Visible Visible+ Pro" plan is included

  Scenario: Mint's capped tiers are priced with the intro rate honored
    When the scenarios are computed
    Then the "Mint Mobile Mint 6GB" rows have a 24-month plan cost of 360.00
    And the "Mint Mobile Mint 17GB" rows have a 24-month plan cost of 420.00
    And the "Mint Mobile Mint 23GB" rows have a 24-month plan cost of 480.00

  Scenario: Mint's data caps drive the needs assessment
    Given the user needs "moderate" data, 0 GB of hotspot, and no international use
    When the scenarios are computed
    Then the "Mint Mobile Mint 23GB" plan is excluded by needs
    And the "Mint Mobile Mint Unlimited" plan is included

  Scenario: Mint Unlimited's soft cap rules it out for heavy data use
    Given the user needs "heavy" data, 0 GB of hotspot, and no international use
    When the scenarios are computed
    Then the "Mint Mobile Mint Unlimited" plan is excluded by needs

  Scenario: US Mobile's Flex and Premium tiers are priced
    When the scenarios are computed
    Then the "US Mobile Unlimited Flex" rows have a 24-month plan cost of 420.00
    And the "US Mobile Unlimited Premium" rows have a 24-month plan cost of 1056.00

  Scenario: US Mobile's tiers split on data priority under heavy needs
    Given the user needs "heavy" data, 0 GB of hotspot, and no international use
    When the scenarios are computed
    Then the "US Mobile Unlimited Starter" plan is excluded by needs
    And the "US Mobile Unlimited Premium" plan is included

  Scenario: US Mobile Starter's published allotment now counts as priority data
    Given the user needs "moderate" data, 0 GB of hotspot, and no international use
    When the scenarios are computed
    Then the "US Mobile Unlimited Starter" plan is included

  Scenario: Boost's tier family is priced with AutoPay rates
    When the scenarios are computed
    Then the "Boost Mobile Unlimited" rows have a 24-month plan cost of 600.00
    And the "Boost Mobile Unlimited+" rows have a 24-month plan cost of 1200.00
    And the "Boost Mobile Unlimited Premium" rows have a 24-month plan cost of 1440.00

  Scenario: Boost's premium-data allotments drive the needs assessment
    Given the user needs "moderate" data, 0 GB of hotspot, and no international use
    When the scenarios are computed
    Then the "Boost Mobile Unlimited" plan is included
    And the "Boost Mobile Global Connection" plan is included

  Scenario: Metro's 2026 lineup is priced with its published rates
    When the scenarios are computed
    Then the "Metro Metro Starter Plus" rows have a 24-month plan cost of 960.00
    And the "Metro Metro Flex Unlimited Plus" rows have a 24-month plan cost of 1440.00

  Scenario: Metro's published four-line rate is used and not estimated
    Given 4 lines with no new devices
    And MVNOs are included
    When the scenarios are computed
    Then the "Metro Metro Flex Unlimited" rows have a 24-month plan cost of 2880.00
    And the "Metro Metro Flex Unlimited" rows are not flagged as estimated

  Scenario: Metro's data allotments drive the needs assessment
    Given the user needs "moderate" data, 0 GB of hotspot, and no international use
    When the scenarios are computed
    Then the "Metro Metro Starter Plus" plan is included
    And the "Metro Metro Flex Unlimited Plus" plan is included

  Scenario: Cricket's 2026 lineup is priced with AutoPay, taxes-in rates
    When the scenarios are computed
    Then the "Cricket Sensible 10GB" rows have a 24-month plan cost of 720.00
    And the "Cricket Smart Unlimited" rows have a 24-month plan cost of 1080.00
    And the "Cricket Supreme Unlimited" rows have a 24-month plan cost of 1320.00

  Scenario: Cricket's published four-line rates are used and not estimated
    Given 4 lines with no new devices
    And MVNOs are included
    When the scenarios are computed
    Then the "Cricket Smart Unlimited" rows have a 24-month plan cost of 2640.00
    And the "Cricket Supreme Unlimited" rows have a 24-month plan cost of 3120.00
    And the "Cricket Supreme Unlimited" rows are not flagged as estimated

  Scenario: T-Mobile Prepaid's 2025 relaunch lineup is priced with AutoPay rates
    When the scenarios are computed
    Then the "T-Mobile Prepaid Starter Monthly" rows have a 24-month plan cost of 960.00
    And the "T-Mobile Prepaid Unlimited Monthly" rows have a 24-month plan cost of 1080.00
    And the "T-Mobile Prepaid Unlimited Plus Monthly" rows have a 24-month plan cost of 1440.00

  Scenario: T-Mobile Prepaid's premium-data allotment drives the needs assessment
    Given the user needs "moderate" data, 0 GB of hotspot, and no international use
    When the scenarios are computed
    Then the "T-Mobile Prepaid Starter Monthly" plan is excluded by needs
    And the "T-Mobile Prepaid Unlimited Monthly" plan is included

  Scenario: T-Mobile Prepaid Unlimited Plus's international perk counts for the needs assessment
    Given the user needs "light" data, 0 GB of hotspot, and international use
    When the scenarios are computed
    Then the "T-Mobile Prepaid Unlimited Monthly" plan is excluded by needs
    And the "T-Mobile Prepaid Unlimited Plus Monthly" plan is included

  Scenario: The catalog covers at least twenty-nine MVNO plans
    Then the data includes at least 29 MVNO plans
