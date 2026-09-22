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

  Scenario: The catalog covers at least seventeen MVNO plans
    Then the data includes at least 17 MVNO plans
