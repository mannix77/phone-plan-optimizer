Feature: Best-path determination and ranking
  The app determines which acquisition path makes the most sense by
  ranking every row on true 24-month cost: everything paid in months
  1-24 plus the device balance still owed at month 24. The best path is
  tagged per plan, and the bring-your-own baseline never competes for
  the tag.

  Background:
    Given 1 line with a new "iPhone 17 (256GB)" and no trade-in

  Scenario: True 24-month cost is paid plus the balance still owed
    When the scenarios are computed
    Then every row's true cost equals its plan cost plus devices paid plus owed at month 24

  Scenario: Rows are ranked by true 24-month cost ascending
    When the scenarios are computed
    Then the rows are sorted by true cost ascending

  Scenario: Exactly one device path per plan is tagged best
    When the scenarios are computed
    Then every plan with device rows has exactly one row tagged best

  Scenario: The tagged row is that plan's cheapest by true cost
    When the scenarios are computed
    Then every best-tagged row has the lowest true cost among its plan's device rows

  Scenario: The bring-your-own baseline is never tagged best
    Given the "byod" path is also selected
    When the scenarios are computed
    Then no "byod" row is tagged best

  Scenario: Only selected paths are compared
    Given only the "outright" path is selected
    When the scenarios are computed
    Then every row uses the "outright" path

  Scenario: Deselecting every path falls back to the bring-your-own baseline
    Given no paths are selected
    When the scenarios are computed
    Then every plan has exactly one row and it uses the "byod" path
